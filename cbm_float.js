"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
/*
 *  IEEE double precision to CBM 5 byte float conversion
 *
 *  written 2008-06-19 by Michael Kircher
 */
function CBMFloat(number /*S: string*/) {
    //let number = Number(S); // atof
    var cbm_mantissa;
    var cbm_exponent;
    var _a = frexp(number), mantissa = _a[0], exponent = _a[1];
    cbm_mantissa = (4294967296.0 * Math.abs(mantissa)) & 0x7FFFFFFF + 2147483648 * (mantissa < 0 ? 1 : 0);
    cbm_exponent = 128 + exponent;
    if (number == 0.0) {
        cbm_exponent = 0;
        cbm_mantissa = 0;
    }
    var R = [
        "$" + utils_1.hex((cbm_exponent) & 0xFF),
        "$" + utils_1.hex((cbm_mantissa >> 24) & 0xFF),
        "$" + utils_1.hex((cbm_mantissa >> 16) & 0xFF),
        "$" + utils_1.hex((cbm_mantissa >> 8) & 0xFF),
        "$" + utils_1.hex((cbm_mantissa >> 0) & 0xFF)
    ];
    return R;
}
exports.CBMFloat = CBMFloat;
// taken from http://locutus.io/c/math/frexp/
function frexp(arg) {
    //  discuss at: http://locutus.io/c/frexp/
    // original by: Oskar Larsson Högfeldt (http://oskar-lh.name/)
    //      note 1: Instead of
    //      note 1: double frexp( double arg, int* exp );
    //      note 1: this is built as
    //      note 1: [double, int] frexp( double arg );
    //      note 1: due to the lack of pointers in JavaScript.
    //      note 1: See code comments for further information.
    //   example 1: frexp(1)
    //   returns 1: [0.5, 1]
    //   example 2: frexp(1.5)
    //   returns 2: [0.75, 1]
    //   example 3: frexp(3 * Math.pow(2, 500))
    //   returns 3: [0.75, 502]
    //   example 4: frexp(-4)
    //   returns 4: [-0.5, 3]
    //   example 5: frexp(Number.MAX_VALUE)
    //   returns 5: [0.9999999999999999, 1024]
    //   example 6: frexp(Number.MIN_VALUE)
    //   returns 6: [0.5, -1073]
    //   example 7: frexp(-Infinity)
    //   returns 7: [-Infinity, 0]
    //   example 8: frexp(-0)
    //   returns 8: [-0, 0]
    //   example 9: frexp(NaN)
    //   returns 9: [NaN, 0]
    // Potential issue with this implementation:
    // the precisions of Math.pow and the ** operator are undefined in the ECMAScript standard,
    // however, sane implementations should give the same results for Math.pow(2, <integer>) operations
    // Like frexp of C and std::frexp of C++,
    // but returns an array instead of using a pointer argument for passing the exponent result.
    // Object.is(n, frexp(n)[0] * 2 ** frexp(n)[1]) for all number values of n except when Math.isFinite(n) && Math.abs(n) > 2**1023
    // Object.is(n, (2 * frexp(n)[0]) * 2 ** (frexp(n)[1] - 1)) for all number values of n
    // Object.is(n, frexp(n)[0]) for these values of n: 0, -0, NaN, Infinity, -Infinity
    // Math.abs(frexp(n)[0]) is >= 0.5 and < 1.0 for any other number-type value of n
    // See http://en.cppreference.com/w/c/numeric/math/frexp for a more detailed description
    arg = Number(arg);
    var result = [arg, 0];
    if (arg !== 0 && Number.isFinite(arg)) {
        var absArg = Math.abs(arg);
        // Math.log2 was introduced in ES2015, use it when available
        var log2 = Math.log2 || function log2(n) { return Math.log(n) * Math.LOG2E; };
        var exp = Math.max(-1023, Math.floor(log2(absArg)) + 1);
        var x = absArg * Math.pow(2, -exp);
        // These while loops compensate for rounding errors that sometimes occur because of ECMAScript's Math.log2's undefined precision
        // and also works around the issue of Math.pow(2, -exp) === Infinity when exp <= -1024
        while (x < 0.5) {
            x *= 2;
            exp--;
        }
        while (x >= 1) {
            x *= 0.5;
            exp++;
        }
        if (arg < 0) {
            x = -x;
        }
        result[0] = x;
        result[1] = exp;
    }
    return result;
}
