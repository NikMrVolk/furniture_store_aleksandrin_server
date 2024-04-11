export function pushIfNewElUnique<T>(arr: T[], element: T): T[] {
    if (!arr.includes(element)) {
        return [...arr, element]
    }
    return arr
}