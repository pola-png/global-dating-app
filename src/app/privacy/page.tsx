
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/MainLayout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
               <Link href="/" passHref>
                  <Button variant="ghost" size="icon">
                      <ArrowLeft />
                  </Button>
               </Link>
                <div>
                    <CardTitle className="font-headline text-3xl">Privacy & Content Policy</CardTitle>
                    <CardDescription>Last updated: August 17, 2025</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="prose prose-stone dark:prose-invert max-w-none space-y-4 text-muted-foreground">
            <p>
              This application ("the app") contains social functions, like chats, with the objective for users to share information.
            </p>
            <p>
              Consequently, the app can ask the user to enter personal data such as pictures or birthday.
            </p>
            <p>
              These personal data are displayed to other users of the app. These data aren't shared with any other entity or third organizations.
            </p>
            <p>
              Users can delete their personal data using the link for that purpose that exists in the user profile options in the app.
            </p>
            <p>
              It's prohibited to publish content for adults only, like images with sexual content or images of extreme violence.
            </p>
            <p>
              Images and Videos entered by the user are sent to the app server in order to be retrieved later by the user himself, and so that the app can offer the functionalities according to its description.
            </p>
            <p>
              We allow third-party companies to serve ads and collect certain anonymous information when you visit our app. These companies may use anonymous information such as your Google Advertising ID, your device type and version, browsing activity, location and other technical data relating to your device, in order to provide advertisements.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
