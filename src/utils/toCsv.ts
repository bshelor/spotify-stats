/**
 * Convert JSON object array to csv string
 * @param array 
 * @returns csv string
 */
export const toCsv = (array: Record<string, any>[]): string => {
  if (!array.length) { return ''; }

  let csvString = '';

  /* headers */
  let first = true;
  Object.keys(array[0]).forEach(k => {
    if (first) {
      csvString += `"${k}"`;
      first = false;
    } else {
      csvString += `,"${k}"`
    }
  });
  csvString += '\n';

  array.forEach(e => {
    let first = true;
    Object.keys(e).forEach(k => {
      if (first) {
        csvString += `"${e[k]}"`;
        first = false;
      } else {
        csvString += `,"${e[k]}"`;
      }
    });
    csvString += '\n';
  });

  return csvString;
}