/**
 * Binary body — browser file picker.
 * Stores selected file name as the display value; actual file content
 * is read separately when the request is executed.
 */

interface BodyBinaryPickerProps {
  filePath: string | null;
  onSelect: (path: string | null) => void;
}

export function BodyBinaryPicker({ filePath, onSelect }: BodyBinaryPickerProps) {
  function handleSelect() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files?.[0];
      onSelect(file ? file.name : null);
    };
    input.click();
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <button
        type="button"
        onClick={handleSelect}
        className="rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)]"
      >
        Select file
      </button>
      {filePath && (
        <p className="font-mono text-sm text-gray-400 truncate" title={filePath}>
          {filePath}
        </p>
      )}
    </div>
  );
}
