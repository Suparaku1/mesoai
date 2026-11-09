import { queryOptions } from "@tanstack/react-query";
import { listTutorThreads, getTutorThread } from "./tutor-history.functions";
export const tutorThreadsOptions = () =>
  queryOptions({ queryKey: ["tutor-threads"], queryFn: () => listTutorThreads() });
export const tutorThreadOptions = (id: string) =>
  queryOptions({ queryKey: ["tutor-thread", id], queryFn: () => getTutorThread({ data: { id } }) });
