import test from "node:test";
import assert from "node:assert/strict";
import { getExpandedNodeDialogWidth, getExpandedNodeTitle } from "./expand";

test("script 节点使用大宽度弹窗", () => {
  assert.equal(getExpandedNodeDialogWidth("script"), "92vw");
});

test("media 节点使用中宽度弹窗", () => {
  assert.equal(getExpandedNodeDialogWidth("media"), "78vw");
});

test("loop 节点返回正确标题", () => {
  assert.equal(getExpandedNodeTitle("loop"), "循环节点");
});
