(function (root) {
  'use strict';

  const TimerInput = {
    bind({ element, host = window, timer, states, isBlocked = () => false }) {
      if (!element || !timer) return () => {};

      let isTouching = false;
      let activePointerId = null;
      let stoppedPointerId = null;

      function shouldIgnore(e) {
        if (isBlocked && isBlocked()) return true;
        if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea, summary, [contenteditable]')) {
          return true;
        }
        return false;
      }

      function onPointerDown(e) {
        if (stoppedPointerId === e.pointerId) return;
        if (timer.state === states.RUNNING) {
          if (e.cancelable) e.preventDefault();
          timer.stop();
          return;
        }

        if (shouldIgnore(e)) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (activePointerId !== null && activePointerId !== e.pointerId) return;

        activePointerId = e.pointerId;
        isTouching = true;

        if (e.cancelable) e.preventDefault();
        timer.handleHoldStart();
      }

      function onPointerUp(e) {
        if (stoppedPointerId === e.pointerId) {
          stoppedPointerId = null;
          return;
        }
        if (activePointerId !== null && e.pointerId !== activePointerId) return;
        activePointerId = null;

        if (!isTouching) return;
        isTouching = false;

        if (timer.state === states.RUNNING) {
          if (e.cancelable) e.preventDefault();
          timer.stop();
          return;
        }

        if (e.cancelable) e.preventDefault();
        timer.handleHoldEnd();
      }

      function onPointerCancel(e) {
        if (stoppedPointerId === e.pointerId) stoppedPointerId = null;
        if (activePointerId !== null && e.pointerId !== activePointerId) return;
        activePointerId = null;
        if (!isTouching) return;
        isTouching = false;
        timer.cancelHold();
      }

      function onHostPointerDown(e) {
        stoppedPointerId = timer.state === states.RUNNING ? e.pointerId : null;
        if (timer.state === states.RUNNING) {
          if (e.cancelable) e.preventDefault();
          timer.stop();
        }
      }

      element.addEventListener('pointerdown', onPointerDown, { passive: false });
      element.addEventListener('pointerup', onPointerUp, { passive: false });
      element.addEventListener('pointercancel', onPointerCancel, { passive: false });
      host.addEventListener('pointerdown', onHostPointerDown, { passive: false, capture: true });

      return function unbind() {
        element.removeEventListener('pointerdown', onPointerDown);
        element.removeEventListener('pointerup', onPointerUp);
        element.removeEventListener('pointercancel', onPointerCancel);
        host.removeEventListener('pointerdown', onHostPointerDown, true);
      };
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TimerInput;
  else root.TimerInput = TimerInput;
})(typeof window !== 'undefined' ? window : globalThis);
