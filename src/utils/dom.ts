/**
 * DOM utility functions for safe element access and manipulation
 */

export class DOMUtils {
  /**
   * Safely get an element by ID with type checking
   */
  static getElementById<T extends HTMLElement = HTMLElement>(
    id: string,
    expectedType?: new () => T
  ): T | null {
    const element = document.getElementById(id);

    if (!element) {
      console.warn(`Element with id '${id}' not found`);
      return null;
    }

    if (expectedType && !(element instanceof expectedType)) {
      console.error(`Element with id '${id}' is not an instance of ${expectedType.name}`);
      return null;
    }

    return element as T;
  }

  /**
   * Safely query a single element within a parent
   */
  static querySelector<T extends Element = Element>(
    selector: string,
    parent: Element | Document = document,
    expectedType?: new () => T
  ): T | null {
    const element = parent.querySelector(selector);

    if (!element) {
      console.warn(`Element with selector '${selector}' not found`);
      return null;
    }

    if (expectedType && !(element instanceof expectedType)) {
      console.error(`Element with selector '${selector}' is not an instance of ${expectedType.name}`);
      return null;
    }

    return element as T;
  }

  /**
   * Safely query multiple elements
   */
  static querySelectorAll<T extends Element = Element>(
    selector: string,
    parent: Element | Document = document,
    expectedType?: new () => T
  ): T[] {
    const elements = Array.from(parent.querySelectorAll(selector));

    if (expectedType) {
      return elements.filter(el => el instanceof expectedType) as T[];
    }

    return elements as T[];
  }

  /**
   * Add CSS class to element
   */
  static addClass(element: Element, className: string): void {
    if (element.classList.contains(className)) return;
    element.classList.add(className);
  }

  /**
   * Remove CSS class from element
   */
  static removeClass(element: Element, className: string): void {
    element.classList.remove(className);
  }

  /**
   * Toggle CSS class on element
   */
  static toggleClass(element: Element, className: string): void {
    element.classList.toggle(className);
  }

  /**
   * Set element visibility
   */
  static setVisible(element: Element, visible: boolean): void {
    if (visible) {
      this.removeClass(element, 'hidden');
      (element as HTMLElement).style.display = '';
    } else {
      this.addClass(element, 'hidden');
      (element as HTMLElement).style.display = 'none';
    }
  }

  /**
   * Check if element is visible
   */
  static isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  /**
   * Set element opacity with optional transition
   */
  static setOpacity(element: Element, opacity: number, transition?: string): void {
    const htmlElement = element as HTMLElement;
    htmlElement.style.opacity = opacity.toString();

    if (transition) {
      htmlElement.style.transition = transition;
    }
  }

  /**
   * Remove element from DOM
   */
  static remove(element: Element): void {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Create element with attributes and content
   */
  static createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    attributes: Record<string, string> = {},
    content?: string | Node
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    });

    // Set content
    if (content) {
      if (typeof content === 'string') {
        element.textContent = content;
      } else {
        element.appendChild(content);
      }
    }

    return element;
  }
}
