import clsx from "clsx"
import React from "react"

const RadioButton = ({
  name,
  id,
  value,
  onChange,
  checked,
  text,
}) => {
  return (
    <label
      htmlFor={id}
      className="cursor-pointer text-sm"
    >
      <input
        type="radio"
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        checked={checked}
        className="peer sr-only m-0"
      />

      <span className="relative top-1 mr-1 inline-block size-5 rounded-full border-2 border-purple-500 peer-checked:border-purple-500">
        <span
          className={clsx(
            "absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-200",
            {
              "bg-purple-500 opacity-100": checked,
              "opacity-0": !checked,
            }
          )}
        />
      </span>

      {text}
    </label>
  )
}

export default RadioButton
