import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * CardDemo component to showcase different card variants.
 * @returns {JSX.Element} The rendered CardDemo component.
 */
export default function CardDemo() {
  return (
    <div className="p-4 md:p-6 grid gap-4 md:grid-cols-3">
      {/* Elevated Card */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Elevated Card</CardTitle>
          <CardDescription>This is an elevated card.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card has a shadow and a slightly elevated appearance.</p>
        </CardContent>
        <CardFooter>
          <Button variant="text">Action</Button>
        </CardFooter>
      </Card>

      {/* Filled Card */}
      <Card variant="filled">
        <CardHeader>
          <CardTitle>Filled Card</CardTitle>
          <CardDescription>This is a filled card.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card has a solid background color and no shadow.</p>
        </CardContent>
        <CardFooter>
          <Button variant="text">Action</Button>
        </CardFooter>
      </Card>

      {/* Outlined Card */}
      <Card variant="outlined">
        <CardHeader>
          <CardTitle>Outlined Card</CardTitle>
          <CardDescription>This is an outlined card.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card has a border and no shadow.</p>
        </CardContent>
        <CardFooter>
          <Button variant="text">Action</Button>
        </CardFooter>
      </Card>
    </div>
  );
}