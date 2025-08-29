
'use client';

import { Card } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

export function AdBanner() {
  return (
    <Card className="w-full h-24 flex items-center justify-center bg-muted/50 border-dashed">
        <div className="text-center text-muted-foreground">
            <Megaphone className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm font-semibold">Advertisement</p>
            <p className="text-xs">Your AdSense Banner/Native Ad Unit Here</p>
        </div>
    </Card>
  );
}
