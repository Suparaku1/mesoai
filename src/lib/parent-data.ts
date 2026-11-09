export type ParentChild = {
  id: string;
  first_name: string;
  last_name: string;
  drejtimi: string | null;
  klasa: string | null;
  paralelja: string | null;
  courses: {
    id: string;
    title: string;
    status: string;
    teacher: string | null;
    topics: number;
    completed: number;
  }[];
  grades: {
    id: string;
    grade: number;
    feedback: string | null;
    pending: boolean;
    date: string;
    course_id: string;
    title: string;
  }[];
  homeworkGrades: { course_id: string; grade: number; feedback: string | null }[];
  homework: {
    id: string;
    instructions: string;
    due_date: string | null;
    title: string;
    course_id: string;
    submissions: { id: string; grade: number | null; feedback: string | null; date: string }[];
  }[];
  attendance: { date: string; status: string; note: string | null; course_id: string }[];
  exams: {
    id: string;
    title: string;
    scheduled_at: string;
    duration_min: number;
    room: string | null;
  }[];
  schedule: { day: number; start: string; end: string; room: string | null; course: string }[];
};
