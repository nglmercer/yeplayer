export function getParentByClass(
  element: Element,
  classNames: string[],
  options?: { stopAt?: string },
): Element | null {
  let parent: Element | null = element.parentElement;
  while (parent) {
    if (classNames.some((name) => parent!.classList.contains(name))) {
      return parent;
    }
    if (options?.stopAt && parent.tagName === options.stopAt.toUpperCase()) {
      return null;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function getClosest(
  element: Element | null,
  selectors: string[],
): Element | null {
  if (!element) return null;
  const matched = element.closest(selectors.join(", "));
  return matched as Element | null;
}