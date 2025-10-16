import { Button } from "@/components/ui/button";

export default function ButtonDemo() {
  return (
    <div className="p-10 space-y-4">
      <h1 className="text-2xl font-headline">Button Demo</h1>
      <div className="space-x-2">
        <Button variant="default">Default</Button>
        <Button variant="filled">Filled</Button>
        <Button variant="tonal">Tonal</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="elevated">Elevated</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="text">Text</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  );
}