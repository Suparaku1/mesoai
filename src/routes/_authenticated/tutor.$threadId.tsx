import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/lib/seo";
import { tutorThreadOptions } from "@/lib/tutor-queries";
import { TutorChat, type TutorMessage } from "@/components/tutor/tutor-chat";
export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  head: () => ({
    meta: pageMeta(
      "Bisedë me Tutorin",
      "Pyetje dhe përgjigje të ruajtura privatisht, me referenca të materialeve të kursit.",
    ),
  }),
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(tutorThreadOptions(params.threadId)),
  component: ThreadPage,
});
function ThreadPage() {
  const { threadId } = Route.useParams();
  const { data } = useSuspenseQuery(tutorThreadOptions(threadId));
  return (
    <TutorChat
      key={threadId}
      id={threadId}
      title={data.title}
      courseId={data.course_id}
      initialMessages={data.messages as unknown as TutorMessage[]}
    />
  );
}
