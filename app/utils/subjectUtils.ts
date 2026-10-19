export const normalizeClassCodeInput = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

export const formatSubjectDisplay = (subject: {
  classCode?: string | null;
  subjectName: string;
}) =>
  subject.classCode
    ? `${subject.classCode} - ${subject.subjectName}`
    : subject.subjectName;
