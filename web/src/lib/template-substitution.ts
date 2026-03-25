export interface TemplateContext {
  firstName: string;
  company: string;
  role: string;
  connection: string;
}

export function substituteTemplateVars(
  template: string,
  context: TemplateContext
): string {
  let result = template;
  result = result.replace(/{first_name}/g, context.firstName);
  result = result.replace(/{company}/g, context.company);
  result = result.replace(/{role}/g, context.role);
  result = result.replace(/{connection}/g, context.connection);
  return result;
}
