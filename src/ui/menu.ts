import { ICONS, createSVG } from "./icons";

export type MenuIcon = string | HTMLElement;

export type MenuItem =
  | {
    type: "toggle";
    id: string;
    label: string;
    icon?: MenuIcon;
    value: boolean;
    onChange: (v: boolean) => void;
  }
  | {
    type: "select";
    id: string;
    label: string;
    icon?: MenuIcon;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (v: string) => void;
  }
  | {
    type: "action";
    id: string;
    label: string;
    icon?: MenuIcon;
    onClick: () => void;
  };

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export interface MenuOptions {
  className?: string;
}

export class Dropdown {
  private element: HTMLElement;
  private isOpen = false;
  private onClose?: () => void;

  constructor(className: string = "") {
    this.element = document.createElement("div");
    this.element.className = `ap-dropdown ${className}`;
  }

  open() {
    this.isOpen = true;
    this.element.style.display = "block";
    this.element.classList.add("ap-dropdown-open");
  }

  close() {
    this.isOpen = false;
    this.element.style.display = "none";
    this.element.classList.remove("ap-dropdown-open");
    this.onClose?.();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  getElement() {
    return this.element;
  }
  isDropdownOpen() {
    return this.isOpen;
  }
  setOnClose(callback: () => void) {
    this.onClose = callback;
  }
}

export class Menu {
  readonly root: HTMLElement;
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private subpanel: HTMLElement;
  private groups: MenuGroup[] = [];
  private options: MenuOptions;
  private currentDropdown?: Dropdown;
  private activeSelectItem?: Extract<MenuItem, { type: "select" }>;

  constructor(
    root: HTMLElement,
    groups: MenuGroup[],
    options: MenuOptions = {},
  ) {
    this.root = root;
    this.options = options;
    this.overlay = document.createElement("div");
    this.panel = document.createElement("div");
    this.subpanel = document.createElement("div");
    this.overlay.className = "ap-overlay";
    this.panel.className = "ap-panel";
    this.subpanel.className = "ap-subpanel";
    if (options.className) this.panel.className += " " + options.className;

    // Enhanced overlay click handling
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.overlay.contains(e.target as Node)) {
        this.closeCurrentDropdown();
      }
    });

    this.overlay.appendChild(this.panel);
    this.overlay.appendChild(this.subpanel);
    this.root.appendChild(this.overlay);
    this.setGroups(groups);
    this.close();
  }

  setGroups(groups: MenuGroup[]) {
    this.groups = groups;
    this.renderMain();
  }

  open() {
    this.overlay.style.display = "block";
    this.overlay.classList.add("ap-overlay-open");
  }

  close() {
    this.overlay.style.display = "none";
    this.overlay.classList.remove("ap-overlay-open");
    this.subpanel.innerHTML = "";
    this.subpanel.style.display = "none";
    this.closeCurrentDropdown();
  }

  toggle() {
    if (
      this.overlay.style.display === "none" ||
      this.overlay.style.display === ""
    )
      this.open();
    else this.close();
  }

  private closeCurrentDropdown() {
    if (this.currentDropdown) {
      this.currentDropdown.close();
      this.currentDropdown = undefined;
    }
    // Also close subpanel if it's open
    this.closeSubpanel();
  }

  private openDropdown(dropdown: Dropdown) {
    this.closeCurrentDropdown();
    this.currentDropdown = dropdown;
    dropdown.open();
    dropdown.setOnClose(() => {
      this.currentDropdown = undefined;
    });
  }

  private openSubpanel() {
    this.panel.classList.add("ap-panel-hidden");
    this.subpanel.classList.add("ap-subpanel-visible");
  }

  private closeSubpanel() {
    this.panel.classList.remove("ap-panel-hidden");
    this.subpanel.classList.remove("ap-subpanel-visible");
    setTimeout(() => {
      if (!this.subpanel.classList.contains("ap-subpanel-visible")) {
        this.subpanel.innerHTML = "";
      }
    }, 400);
  }

  private renderMain() {
    this.panel.innerHTML = "";
    for (const g of this.groups) {
      const h = document.createElement("div");
      h.className = "ap-group-title";
      h.textContent = g.label;
      this.panel.appendChild(h);
      for (const item of g.items) this.panel.appendChild(this.renderItem(item));
    }
  }

  private renderItem(item: MenuItem) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "ap-row";
    const left = document.createElement("div");
    left.className = "ap-left";
    const right = document.createElement("div");
    right.className = "ap-right";
    const label = document.createElement("span");
    label.className = "ap-label";
    label.textContent = item.label;
    left.appendChild(this.iconEl(item.icon));
    left.appendChild(label);
    row.appendChild(left);
    row.appendChild(right);

    if (item.type === "toggle") {
      const toggle = document.createElement("span");
      toggle.className = "ap-toggle" + (item.value ? " ap-toggle-on" : "");
      right.appendChild(toggle);
      row.onclick = (e) => {
        e.stopPropagation();
        item.value = !item.value;
        toggle.className = "ap-toggle" + (item.value ? " ap-toggle-on" : "");
        item.onChange(item.value);
      };
    } else if (item.type === "select") {
      const val = document.createElement("span");
      val.className = "ap-value";
      val.textContent =
        item.options.find((o) => o.value === item.value)?.label || "";
      const arrow = document.createElement("span");
      arrow.className = "ap-arrow";
      arrow.appendChild(createSVG(ICONS.menuArrow, { size: 16, color: "var(--ap-on-surface-variant)" }));
      right.appendChild(val);
      right.appendChild(arrow);
      row.onclick = (e) => {
        e.stopPropagation();
        this.openSelect(item);
      };
    } else {
      row.onclick = (e) => {
        e.stopPropagation();
        item.onClick();
      };
    }
    return row;
  }

  private openSelect(item: Extract<MenuItem, { type: "select" }>) {
    // Check if clicking the same select item to toggle
    if (
      this.activeSelectItem === item &&
      this.subpanel.style.display === "block"
    ) {
      this.closeSubpanel();
      this.activeSelectItem = undefined;
      return;
    }

    this.activeSelectItem = item;
    this.subpanel.innerHTML = "";

    // Header with Back Button
    const header = document.createElement("div");
    header.className = "ap-menu-header";

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "ap-back-btn";
    backBtn.appendChild(createSVG(ICONS.menuBack));
    backBtn.onclick = (e) => {
      e.stopPropagation();
      this.closeSubpanel();
    };

    const title = document.createElement("div");
    title.className = "ap-menu-title";
    title.textContent = item.label;

    header.appendChild(backBtn);
    header.appendChild(title);
    this.subpanel.appendChild(header);

    for (const opt of item.options) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "ap-row";
      const left = document.createElement("div");
      left.className = "ap-left";
      const right = document.createElement("div");
      right.className = "ap-right";
      const label = document.createElement("span");
      label.className = "ap-label";
      label.textContent = opt.label;
      const check = document.createElement("span");
      check.className =
        "ap-check" + (opt.value === item.value ? " ap-check-on" : "");
      check.appendChild(createSVG(ICONS.check, { size: 14, color: "var(--ap-primary)" }));
      left.appendChild(label);
      right.appendChild(check);
      row.appendChild(left);
      row.appendChild(right);
      row.onclick = (e) => {
        e.stopPropagation();
        item.value = opt.value;
        item.onChange(opt.value);
        this.renderMain();

        // Update selection UI immediately in subpanel
        this.subpanel.querySelectorAll(".ap-check").forEach(c => c.classList.remove("ap-check-on"));
        this.subpanel.querySelectorAll(".ap-row").forEach(r => r.classList.remove("ap-row-selected"));
        check.classList.add("ap-check-on");
        row.classList.add("ap-row-selected");

        // Delayed close for better UX
        setTimeout(() => {
          this.closeSubpanel();
          this.activeSelectItem = undefined;
        }, 300);
      };
      if (opt.value === item.value) row.classList.add("ap-row-selected");
      this.subpanel.appendChild(row);
    }

    this.open();

    // Trigger animation after a brief delay
    setTimeout(() => {
      this.openSubpanel();
    }, 10);
  }

  private closeAllSubmenus() {
    this.closeSubpanel();
    this.closeCurrentDropdown();
    this.activeSelectItem = undefined;
  }

  private iconEl(icon?: MenuIcon) {
    const span = document.createElement("span");
    span.className = "ap-icon";
    if (!icon) return span;
    if (typeof icon === "string") {
        if (ICONS[icon as keyof typeof ICONS]) {
            span.appendChild(createSVG(ICONS[icon as keyof typeof ICONS]));
        } else {
            span.innerHTML = icon;
        }
    } else span.appendChild(icon);
    return span;
  }
}
