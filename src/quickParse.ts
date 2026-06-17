// Parse quick-add syntax: "#Projekt" assigns/creates a project,
// "@Kategorie" assigns/creates a category. Tokens are stripped from the title.
// Multi-word values use underscores, e.g. "#Mein_Projekt".

export interface ParsedQuickAdd {
  title: string;
  projectName: string | null;
  categoryNames: string[];
}

const humanize = (raw: string) => raw.replace(/_/g, ' ').trim();

export function parseQuickAdd(input: string): ParsedQuickAdd {
  let projectName: string | null = null;
  const categoryNames: string[] = [];

  const stripped = input.replace(/([#@])([^\s#@]+)/g, (_, marker: string, value: string) => {
    const name = humanize(value);
    if (!name) return '';
    if (marker === '#') {
      if (projectName === null) projectName = name; // first #token wins
    } else {
      if (!categoryNames.some((c) => c.toLowerCase() === name.toLowerCase())) {
        categoryNames.push(name);
      }
    }
    return '';
  });

  const title = stripped.replace(/\s{2,}/g, ' ').trim();
  return { title, projectName, categoryNames };
}
