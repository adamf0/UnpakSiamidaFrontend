import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { Controller } from "react-hook-form";

export default function RestrictedCkEditor({ label, required, disabled=false, name, control, error }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <Controller
        name={name}
        control={control}
        rules={
          !disabled
            ? {
                required: `${label} wajib diisi`,
                validate: (value) => {
                  const stripped = value
                    ?.replace(/<[^>]+>/g, "")
                    .trim();
                  return (
                    stripped.length > 0 || `${label} tidak boleh kosong`
                  );
                },
              }
            : undefined
        }
        render={({ field }) => (
          <CKEditor
            editor={ClassicEditor}
            data={field.value || ""}
            disabled={disabled}
            onChange={(event, editor) => {
              field.onChange(editor.getData());
            }}
            config={{
            toolbar: [
              "bold",
              "italic",
              "|",
              "numberedList",
              "bulletedList",
              "|",
              "undo",
              "redo",
            ],

            // ⛔ disable fitur lain
            removePlugins: [
              "Heading",
              "Link",
              "Image",
              "ImageToolbar",
              "ImageUpload",
              "MediaEmbed",
              "Table",
              "BlockQuote",
              "CodeBlock",
              "CKFinder",
              "EasyImage",
              "PasteFromOffice",
            ],

            // ✅ whitelist HTML
            htmlSupport: {
              allow: [
                {
                  name: "p",
                },
                {
                  name: "strong",
                },
                {
                  name: "em",
                },
                {
                  name: "ol",
                  children: ["li"],
                },
                {
                  name: "ul",
                  children: ["li"],
                },
                {
                  name: "li",
                },
              ],
            },

            // 🔒 force <p> instead of <div>
            enterMode: "p",
            shiftEnterMode: "p",

            // clean output
            autoParagraph: true,
          }}
          />
        )}
      />

      {error?.message && (
        <p className="text-xs text-red-500 mt-1">{error.message}</p>
      )}
    </div>
  );
}
