"use client";

// Universal polyfills for Android 5.0.2 / Legacy Chromium 37+ / Non-secure contexts
if (typeof window !== "undefined") {
  // 1. globalThis
  if (typeof (window as any).globalThis === "undefined") {
    (window as any).globalThis = window;
  }

  // 2. crypto & crypto.randomUUID & getRandomValues
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  if (!(window.crypto as any).randomUUID) {
    (window.crypto as any).randomUUID = function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
  if (!window.crypto.getRandomValues) {
    window.crypto.getRandomValues = function (arr: any) {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    };
  }

  // 3. String.prototype.replaceAll
  if (!(String.prototype as any).replaceAll) {
    (String.prototype as any).replaceAll = function (str: any, newStr: any) {
      return (this as string).split(str).join(newStr);
    };
  }

  // 4. Object.fromEntries
  if (!(Object as any).fromEntries) {
    (Object as any).fromEntries = function (entries: any) {
      const res: any = {};
      if (!entries) return res;
      for (const [key, val] of entries) {
        res[key] = val;
      }
      return res;
    };
  }

  // 5. Array.prototype.flat & flatMap
  if (!(Array.prototype as any).flat) {
    (Array.prototype as any).flat = function (depth?: number) {
      const d = depth === undefined ? 1 : Math.floor(depth);
      if (d < 1) return Array.prototype.slice.call(this);
      const flatten = (arr: any[], cur: number): any[] => {
        let res: any[] = [];
        for (let i = 0; i < arr.length; i++) {
          if (Array.isArray(arr[i]) && cur < d) {
            res = res.concat(flatten(arr[i], cur + 1));
          } else {
            res.push(arr[i]);
          }
        }
        return res;
      };
      return flatten(this as any[], 0);
    };
  }

  if (!(Array.prototype as any).flatMap) {
    (Array.prototype as any).flatMap = function (cb: any, thisArg?: any) {
      return ((this as any[]).map(cb, thisArg) as any).flat(1);
    };
  }

  // 6. AbortController
  if (typeof (window as any).AbortController === "undefined") {
    (window as any).AbortController = class {
      signal = {
        aborted: false,
        addEventListener: function () {},
        removeEventListener: function () {},
      };
      abort() {
        this.signal.aborted = true;
      }
    };
  }

  // 7. Observers
  if (typeof (window as any).ResizeObserver === "undefined") {
    (window as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (typeof (window as any).IntersectionObserver === "undefined") {
    (window as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}

import "whatwg-fetch";
