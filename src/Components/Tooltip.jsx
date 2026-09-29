import React, { useState, useRef, cloneElement, isValidElement } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  arrow,
  FloatingArrow,
  useMergeRefs,
} from "@floating-ui/react";

const Tooltip = ({
  children,
  content,
  placement = "top",
  delay = 100,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: !disabled && isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(7),
      flip({ fallbackAxisSideDirection: "start" }),
      shift({ padding: 6 }),
      arrow({ element: arrowRef }),
    ],
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: delay, close: 0 },
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const childrenRef = isValidElement(children) ? (children.props?.ref || children.ref) : null;
  const referenceRef = useMergeRefs([refs.setReference, childrenRef]);

  if (!content) return children;

  return (
    <>
      {isValidElement(children) ? (
        cloneElement(children, {
          ref: referenceRef,
          ...getReferenceProps(children.props),
        })
      ) : (
        <span ref={referenceRef} {...getReferenceProps()}>
          {children}
        </span>
      )}
      {!disabled && isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[9999] px-2.5 py-1 text-xs font-medium text-white bg-gray-900/90 backdrop-blur-xs rounded-md shadow-lg pointer-events-none transition-opacity duration-150 whitespace-nowrap"
          >
            {content}
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="fill-gray-900/90"
              width={8}
              height={4}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default Tooltip;
