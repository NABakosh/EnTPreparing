/**
 * Соответствие предметов платформы (Subject.slug) названиям предметов в BookChunk.subject
 * (это имя папки предмета в resources/books). Дополните, когда будут загружены реальные книги.
 */
export const BOOK_SUBJECTS: Record<string, string[]> = {
  "history-kz": ["история_казахстана", "история казахстана", "қазақстан_тарихы", "казахстан_тарихы", "history"],
  math: ["математика", "алгебра", "геометрия", "math"],
  physics: ["физика", "physics"],
  informatics: ["информатика", "informatics"],
  "math-literacy": [],
  "reading-literacy": [],
};
