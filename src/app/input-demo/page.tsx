import { Input } from "@/components/ui/input";

/**
 * InputDemo component to showcase different input variants.
 * @returns {JSX.Element} The rendered InputDemo component.
 */
export default function InputDemo() {
  return (
    <div className="p-4 md:p-6 grid gap-8 md:grid-cols-2">
      {/* Filled Input */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Filled Input</h2>
        <Input variant="filled" placeholder="Filled Input" />
        <Input variant="filled" placeholder="Filled Input (Disabled)" disabled />
      </div>

      {/* Outlined Input */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Outlined Input</h2>
        <Input variant="outlined" placeholder="Outlined Input" />
        <Input variant="outlined" placeholder="Outlined Input (Disabled)" disabled />
      </div>
    </div>
  );
}