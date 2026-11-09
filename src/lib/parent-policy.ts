export function normalizedStudentName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("sq");
}

export function matchesStudentName(requested: string, first: string, last: string) {
  return normalizedStudentName(requested) === normalizedStudentName(`${first} ${last}`);
}

export function canViewChild(
  parentId: string,
  studentId: string,
  links: { parent_id: string; student_id: string }[],
) {
  return links.some((link) => link.parent_id === parentId && link.student_id === studentId);
}
