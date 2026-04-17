declare module '*.ttl' {
  const content: string;
  export default content;
}

export interface PaneDefinition {
  icon: string
  name: string
  audience: unknown[]
  label: (subject: unknown, context: unknown) => string | null
  render: (subject: unknown, context: { dom: Document }) => HTMLElement
  mintClass?: unknown
  mintNew?: (context: unknown, options: unknown) => Promise<unknown>
}

declare const meetingPane: PaneDefinition
export default meetingPane