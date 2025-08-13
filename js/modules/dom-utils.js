/**
 * DOM Utilities Module
 * Handles all DOM manipulation and element access
 */

export class DOMUtils {
  static getElement(id) {
    return document.getElementById(id);
  }

  static getElements(selector) {
    return document.querySelectorAll(selector);
  }

  static createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
  }

  static toggleClass(element, className, condition = null) {
    if (condition !== null) {
      element.classList.toggle(className, condition);
    } else {
      element.classList.toggle(className);
    }
  }

  static setContent(element, content) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else {
      element.innerHTML = content;
    }
  }

  static show(element) {
    element.style.display = 'block';
  }

  static hide(element) {
    element.style.display = 'none';
  }

  static setDisabled(element, disabled) {
    element.disabled = disabled;
  }
}
