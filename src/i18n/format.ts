export interface Plural {
  one: string;
  other: string;
}

export type FormatVars = Readonly<Record<string, string | number>>;

const TOKEN = /\{(\w+)\}/g;

export function format(template: string, vars: FormatVars): string {
  return template.replace(TOKEN, (whole, name: string) => {
    const value = vars[name];
    return value === undefined ? whole : String(value);
  });
}

export function plural(forms: Plural, count: number): string {
  return count === 1 ? forms.one : forms.other;
}

export function counted(forms: Plural, count: number): string {
  return `${count} ${plural(forms, count)}`;
}

export function countedTemplate(forms: Plural, count: number): string {
  return format(plural(forms, count), { n: count });
}
