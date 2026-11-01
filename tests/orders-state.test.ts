import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  feetKey,
  orderRecord,
  ordersHash,
  ordersNotice,
  readOrders,
} from "../src/core/orders-state";

describe("orders shared choices", () => {
  it("uses the same physical size as the native sliders, including half-step rounding", () => {
    assert.equal(readOrders("#order=ionic&feet=2.6").feet.ionic, 2.5);
    assert.match(
      ordersNotice("#order=ionic&feet=2.6", readOrders("#order=ionic&feet=2.6")),
      /2.6 ft was rounded to 2.5 ft/,
    );
    assert.equal(ordersNotice("#order=ionic&feet=2.5", readOrders("#order=ionic&feet=2.5")), "");
    assert.equal(readOrders("#order=doric&feet=1.63").feet.doric, 1.75);
    assert.equal(readOrders("#order=tuscan&feet=63").feet.tuscan, 65);
    assert.equal(readOrders("#order=ionic&feet=2.625").feet.ionic, 2.75);
  });
  it("retains a middle trial, scale and context through canonical sharing", () => {
    for (const order of ["doric", "ionic", "corinthian"]) {
      const state = readOrders(
        `#order=${order}&columns=8&spacing=systyle&feet=3.25&base=ionic&frieze=carved&view=roof&trial=1.125&target=middle&dims=off&part=acroterion`,
      );
      const reopened = readOrders(ordersHash(state));
      const first = orderRecord(state),
        second = orderRecord(reopened);
      assert.deepEqual(first, second);
      assert.equal(first.unitFeet, 3.25);
      assert.equal(first.trialRatio, 9 / 8);
      assert.equal(first.trialTarget, "middle");
      assert.equal(first.columns, 8);
      assert.equal(first.dimensions, false);
    }
  });
  it("ignores malformed spacing and nonfinite measurements without producing invalid geometry", () => {
    for (const spacing of ["constructor", "toString", "__proto__", "", "arbitrary"]) {
      const state = readOrders(`#order=ionic&spacing=${spacing}&feet=Infinity&trial=NaN`);
      assert.equal(state.ionicSpacing, "eustyle");
      assert.equal(state.feet[feetKey(state.order)], 2.5);
      assert.equal(state.trial, 0.5);
    }
    const state = readOrders("#order=tuscan&view=roof&part=%22%3E%3Cscript%3E");
    assert.equal(state.view, "front");
    assert.equal(state.part, null);
    assert.equal(orderRecord(state).unitName, "temple width");
  });
});
