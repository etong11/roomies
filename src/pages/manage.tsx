import { Role } from "@prisma/client";
import type { GetServerSideProps } from "next";
import { unstable_getServerSession } from "next-auth";
import Link from "next/link";
import { type ReactElement } from "react";
import { toast } from "react-hot-toast";
import Groupless from "../components/Groupless";
import MainLayout, { DashboardCard } from "../components/MainLayout";
import { prisma } from "../server/db/client";
import type { RouterOutputs } from "../utils/trpc";
import { trpc } from "../utils/trpc";
import { authOptions } from "./api/auth/[...nextauth]";
import { type NextPageWithLayout } from "./_app";

type GroupCardProps = {
	membership: NonNullable<RouterOutputs["membership"]["getCurrent"]>;
};

const GroupCard = ({ membership }: GroupCardProps) => {
	const context = trpc.useContext();
	const removeMember = trpc.membership.delete.useMutation({
		onSuccess: async () => {
			await context.membership.invalidate();
			toast.success("Member removed");
		},
		onError: () => {
			toast.error("Failed to remove member");
		},
	});

	return (
		<DashboardCard>
			<div>
				<h3 className="font-bold">Group Members</h3>
				<span className="text-sm font-thin">
					These are the users that are currently in your group.
				</span>
			</div>
			<div>
				{membership.group.members.map((member) => (
					<div
						key={member.id}
						className="m-2 flex items-center justify-between rounded-md bg-base-200 p-4"
					>
						<div className="flex w-full items-center justify-between">
							<div className="text-lg">
								<Link
									className="link-secondary link text-xl font-bold"
									href={`/users/${member.userId}`}
								>
									{member.user.name}
								</Link>{" "}
								- <span className="font-mono">{member.role}</span>
							</div>
							<div>
								<button
									type="button"
									onClick={() =>
										removeMember.mutate({
											id: member.id,
										})
									}
									disabled={
										member.role === Role.ADMIN ||
										member.userId === membership.userId
									}
									className="btn-error btn-sm btn"
								>
									Remove
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</DashboardCard>
	);
};

type ActionCardProps = {
	membership: NonNullable<RouterOutputs["membership"]["getCurrent"]>;
};

const ActionCard = ({ membership }: ActionCardProps) => {
	const context = trpc.useContext();

	const leaveGroup = trpc.membership.delete.useMutation({
		onSuccess: async () => {
			await context.membership.invalidate();
			toast.success("Membership deleted");
		},
		onError: () => {
			toast.error("Failed to delete membership");
		},
	});

	const deleteGroup = trpc.groups.delete.useMutation({
		onSuccess: async () => {
			await context.membership.invalidate();
			toast.success("Group deleted");
		},
		onError: () => {
			toast.error("Failed to delete group");
		},
	});

	return (
		<div className="w-full">
			<DashboardCard>
				<div>
					<h3 className="font-bold">Actions</h3>
					<span className="text-sm font-thin">
						These are actions you can take on your group. The group may be
						deleted if you are the only member.
					</span>
					<div className="m-2 flex items-center justify-between rounded-md bg-base-200 p-4">
						<div className="text-lg">
							<span className="font-mono">{membership.role}</span>
						</div>
						<div className="flex gap-2">
							{membership.role === Role.ADMIN && (
								<button
									type="button"
									onClick={() => deleteGroup.mutate({ id: membership.groupId })}
									className="btn-error btn-sm btn"
									disabled={
										membership.role !== Role.ADMIN ||
										membership.group.members.length > 1
									}
								>
									Delete
								</button>
							)}
							<button
								type="button"
								onClick={() => leaveGroup.mutate({ id: membership.id })}
								className="btn-error btn-sm btn"
								disabled={membership.role === Role.ADMIN}
							>
								Leave
							</button>
						</div>
					</div>
				</div>
			</DashboardCard>
		</div>
	);
};

const Manage: NextPageWithLayout = () => {
	const { data: membership, status } = trpc.membership.getCurrent.useQuery();

	if (status === "loading") return <div>Loading...</div>;
	if (status === "error") return <div>Error</div>;

	if (!membership) return <Groupless />;

	return (
		<>
			<div className="w-full text-3xl font-bold">Your Roommate Group</div>
			<GroupCard membership={membership} />
			<ActionCard membership={membership} />
		</>
	);
};

Manage.getLayout = function getLayout(page: ReactElement) {
	return <MainLayout>{page}</MainLayout>;
};

export default Manage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
	const session = await unstable_getServerSession(
		ctx.req,
		ctx.res,
		authOptions
	);

	const profile = await prisma.profile.findUnique({
		where: {
			userId: session?.user.id,
		},
	});

	if (!profile)
		return {
			redirect: {
				destination: "/setup/1",
				permanent: true,
			},
		};

	return {
		props: {},
	};
};
