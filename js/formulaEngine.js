// ─── Formula Engine ───────────────────────────────────────────────────────────
// Parses and evaluates arithmetic expressions with cell references.
// Uses a recursive descent parser — safe alternative to eval().

export function tokenize(expr, COLS) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }

    // Cell reference: letter A-Z... followed by digits
    if (/[A-Za-z]/.test(ch)) {
      const col = ch.toUpperCase();
      let j = i + 1;
      let numStr = '';
      while (j < expr.length && /\d/.test(expr[j])) { numStr += expr[j]; j++; }
      if (numStr) {
        const row = parseInt(numStr, 10);
        const id = col + row;
        const valid = COLS.includes(col) && row >= 1;
        tokens.push({ type: 'ref', id, valid });
        i = j;
        continue;
      }
      tokens.push({ type: 'unknown', ch });
      i++;
      continue;
    }

    // Number literal
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(expr[i+1] || ''))) {
      let num = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) { num += expr[i++]; }
      tokens.push({ type: 'num', value: parseFloat(num) });
      continue;
    }

    // Operators and parentheses
    if ('+-*/()'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }

    tokens.push({ type: 'unknown', ch }); i++;
  }
  return tokens;
}

/**
 * Helper function to evaluate string values as expressions when used in formulas
 * Returns { value, isString } where value is either a number or a string
 */
function tryEvaluateStringAsExpression(str, getCellValue, COLS) {
  // Check if string looks like it could be a math expression
  // It should contain numbers and operators
  if (typeof str !== 'string' || str.trim() === '') {
    return { value: str, isString: true };
  }

  // Quick check: if string contains operators and/or valid cell refs, try to evaluate it
  const hasOperators = /[+\-*/()]/.test(str);
  const startsWithNumber = /^[\d]/.test(str.trim());
  const startsWithOp = /^[\-+]/.test(str.trim());
  
  if (!hasOperators && !startsWithNumber && !startsWithOp) {
    // Pure text string, don't try to evaluate
    return { value: str, isString: true };
  }

  try {
    // Try to tokenize and evaluate the string as an expression
    const tokens = tokenize(str, COLS);
    let pos = 0;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    function parseExpr() { return parseAddSub(); }

    function parseAddSub() {
      let left = parseMulDiv();
      while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const right = parseMulDiv();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }

    function parseMulDiv() {
      let left = parseUnary();
      while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
        const op = consume().value;
        const right = parseUnary();
        if (op === '/' && right === 0) throw new Error('#DIV/0');
        left = op === '*' ? left * right : left / right;
      }
      return left;
    }

    function parseUnary() {
      if (peek() && peek().type === 'op' && peek().value === '-') { consume(); return -parsePrimary(); }
      if (peek() && peek().type === 'op' && peek().value === '+') { consume(); return parsePrimary(); }
      return parsePrimary();
    }

    function parsePrimary() {
      const t = peek();
      if (!t) throw new Error('#ERROR');

      if (t.type === 'num') { consume(); return t.value; }

      if (t.type === 'ref') {
        consume();
        if (!t.valid) throw new Error('#REF');
        const v = getCellValue(t.id);
        if (typeof v === 'string' && v.startsWith('#')) throw new Error(v);
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      }

      if (t.type === 'op' && t.value === '(') {
        consume();
        const val = parseExpr();
        const closing = peek();
        if (!closing || closing.value !== ')') throw new Error('#ERROR');
        consume();
        return val;
      }

      throw new Error('#ERROR');
    }

    const result = parseExpr();
    if (pos < tokens.length) throw new Error('#ERROR');
    
    // Successfully evaluated as an expression
    return { value: result, isString: false };
  } catch (e) {
    // If evaluation fails, propagate the error
    if (typeof e.message === 'string' && e.message.startsWith('#')) {
      throw e;
    }
    // Otherwise treat as a string
    return { value: str, isString: true };
  }
}

/**
 * Evaluates an expression string (without leading '=').
 */
export function evaluateExpr(expr, getCellValue, COLS, MAX_ROW) {
  const tokens = tokenize(expr, COLS);
  const refs = new Set();
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr() { return parseAddSub(); }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseMulDiv();
      
      // Handle string concatenation: if both operands are strings, concatenate
      if (typeof left === 'string' && typeof right === 'string') {
        left = left + right;
      } else {
        // Numeric operation
        left = op === '+' ? left + right : left - right;
      }
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = consume().value;
      const right = parseUnary();
      if (op === '/' && right === 0) throw new Error('#DIV/0');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function parseUnary() {
    if (peek() && peek().type === 'op' && peek().value === '-') { consume(); return -parsePrimary(); }
    if (peek() && peek().type === 'op' && peek().value === '+') { consume(); return parsePrimary(); }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('#ERROR');

    if (t.type === 'num') { consume(); return t.value; }

    if (t.type === 'ref') {
      consume();
      if (!t.valid) throw new Error('#REF');
      refs.add(t.id);
      const v = getCellValue(t.id);
      
      // Propagate error strings
      if (typeof v === 'string' && v.startsWith('#')) throw new Error(v);
      
      // Try to evaluate string cells as expressions
      if (typeof v === 'string') {
        const evaluated = tryEvaluateStringAsExpression(v, getCellValue, COLS);
        if (evaluated.isString) {
          // Still a string - convert to number
          const n = parseFloat(evaluated.value);
          return isNaN(n) ? 0 : n;
        } else {
          // Was evaluated to a number
          return evaluated.value;
        }
      }
      
      // Numeric value
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    }

    if (t.type === 'op' && t.value === '(') {
      consume();
      const val = parseExpr();
      const closing = peek();
      if (!closing || closing.value !== ')') throw new Error('#ERROR');
      consume();
      return val;
    }

    throw new Error('#ERROR');
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error('#ERROR');
  return { value: result, refs };
}
