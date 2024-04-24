export const concatIfStringNotInclude = ({
    str,
    newStr,
}: {
    str: string
    newStr: string
}) => {
    if (!str.includes(newStr)) {
        return `${str} ${newStr}`
    }
    return str
}
