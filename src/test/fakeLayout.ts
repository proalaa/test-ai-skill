// jsdom does no layout: every element measures as a 0×0 box at the origin.
// dnd-kit finds where a keyboard move goes by measuring elements, so app tests
// install this stand-in for the browser's layout engine instead. It mimics the
// real Board: Columns (`<section>` children of the Board) side by side, Tasks
// (`<li>` in a Column) stacked top to bottom in DOM order.

export const COLUMN_WIDTH = 280;
const COLUMN_GAP = 20;
const COLUMN_HEIGHT = 1000;
const TASK_TOP = 100;
const TASK_HEIGHT = 40;
const TASK_GAP = 10;

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON() {
      return this;
    },
  };
}

function columnLeft(section: Element): number {
  const columns = Array.from(section.parentElement?.children ?? []).filter((el) => el.tagName === 'SECTION');
  return columns.indexOf(section) * (COLUMN_WIDTH + COLUMN_GAP);
}

function fakeRect(element: Element): DOMRect {
  if (element.tagName === 'SECTION') {
    return rect(columnLeft(element), 0, COLUMN_WIDTH, COLUMN_HEIGHT);
  }
  const section = element.closest('section');
  if (element.tagName === 'LI' && section) {
    const index = Array.from(element.parentElement?.children ?? []).indexOf(element);
    return rect(columnLeft(section), TASK_TOP + index * (TASK_HEIGHT + TASK_GAP), COLUMN_WIDTH, TASK_HEIGHT);
  }
  return rect(0, 0, 0, 0);
}

/** Replaces `getBoundingClientRect` for every element with the fake Board layout. */
export function installFakeLayout(): void {
  Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element) {
    return fakeRect(this);
  };
}
