// FortuneSheet 1.0.4 uses dynamic code for three row insertion operations.
// Replace those operations with equivalent array calls for extension CSP.
export function fortuneCsp() {
  return {
    name: 'fortune-extension-csp',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/@fortune-sheet/core/dist/index.esm.js')) return null;
      const replacements = [
        ['new Function("d", "return d.unshift(".concat(arr.join(","), ")"))(d);', 'd.unshift(...arr.map(item => JSON.parse(item)));'],
        ['new Function("d", "return d.splice(".concat(index, ", 0, ").concat(arr.join(","), ")"))(d);', 'd.splice(index, 0, ...arr.map(item => JSON.parse(item)));'],
        ['new Function("d", "return d.splice(".concat(index + 1, ", 0, ").concat(arr.join(","), ")"))(d);', 'd.splice(index + 1, 0, ...arr.map(item => JSON.parse(item)));'],
      ];
      for (const [from, to] of replacements) {
        if (!code.includes(from)) throw new Error('FortuneSheet row insertion implementation changed; review CSP adaptation.');
        code = code.replace(from, to);
      }
      return { code, map: null };
    },
  };
}
