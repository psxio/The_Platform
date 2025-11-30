import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserCircle, Briefcase, MessageSquare, Globe, Clock, Calendar, FileText, Loader2, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  specialty: z.string().min(1, "Please select your specialty"),
  contactHandle: z.string().min(1, "Contact handle is required"),
  contactType: z.string().min(1, "Please select contact type"),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  timezone: z.string().min(1, "Timezone is required"),
  availability: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const specialties = [
  { value: "writer", label: "Writer / Copywriter" },
  { value: "editor", label: "Editor / Proofreader" },
  { value: "designer", label: "Graphic Designer" },
  { value: "video", label: "Video Editor / Producer" },
  { value: "social", label: "Social Media Manager" },
  { value: "marketing", label: "Marketing Specialist" },
  { value: "strategy", label: "Content Strategist" },
  { value: "seo", label: "SEO Specialist" },
  { value: "community", label: "Community Manager" },
  { value: "other", label: "Other" },
];

const contactTypes = [
  { value: "telegram", label: "Telegram" },
  { value: "discord", label: "Discord" },
  { value: "twitter", label: "Twitter/X" },
  { value: "email", label: "Email" },
  { value: "slack", label: "Slack" },
  { value: "other", label: "Other" },
];

const timezones = [
  { value: "UTC-12", label: "UTC-12:00 (Baker Island)" },
  { value: "UTC-11", label: "UTC-11:00 (Samoa)" },
  { value: "UTC-10", label: "UTC-10:00 (Hawaii)" },
  { value: "UTC-9", label: "UTC-09:00 (Alaska)" },
  { value: "UTC-8", label: "UTC-08:00 (Pacific Time)" },
  { value: "UTC-7", label: "UTC-07:00 (Mountain Time)" },
  { value: "UTC-6", label: "UTC-06:00 (Central Time)" },
  { value: "UTC-5", label: "UTC-05:00 (Eastern Time)" },
  { value: "UTC-4", label: "UTC-04:00 (Atlantic Time)" },
  { value: "UTC-3", label: "UTC-03:00 (Buenos Aires)" },
  { value: "UTC-2", label: "UTC-02:00 (Mid-Atlantic)" },
  { value: "UTC-1", label: "UTC-01:00 (Azores)" },
  { value: "UTC+0", label: "UTC+00:00 (London, GMT)" },
  { value: "UTC+1", label: "UTC+01:00 (Paris, Berlin)" },
  { value: "UTC+2", label: "UTC+02:00 (Cairo, Kyiv)" },
  { value: "UTC+3", label: "UTC+03:00 (Moscow, Istanbul)" },
  { value: "UTC+4", label: "UTC+04:00 (Dubai)" },
  { value: "UTC+5", label: "UTC+05:00 (Pakistan)" },
  { value: "UTC+5.5", label: "UTC+05:30 (India)" },
  { value: "UTC+6", label: "UTC+06:00 (Bangladesh)" },
  { value: "UTC+7", label: "UTC+07:00 (Bangkok, Jakarta)" },
  { value: "UTC+8", label: "UTC+08:00 (Singapore, Hong Kong)" },
  { value: "UTC+9", label: "UTC+09:00 (Tokyo, Seoul)" },
  { value: "UTC+10", label: "UTC+10:00 (Sydney)" },
  { value: "UTC+11", label: "UTC+11:00 (Solomon Islands)" },
  { value: "UTC+12", label: "UTC+12:00 (Auckland)" },
];

const availabilityOptions = [
  { value: "full-time", label: "Full-time (40+ hrs/week)" },
  { value: "part-time", label: "Part-time (20-40 hrs/week)" },
  { value: "freelance", label: "Freelance (10-20 hrs/week)" },
  { value: "occasional", label: "Occasional (<10 hrs/week)" },
  { value: "project-based", label: "Project-based only" },
];

interface ContentProfile {
  id: number;
  userId: string;
  specialty: string | null;
  contactHandle: string | null;
  contactType: string | null;
  portfolioUrl: string | null;
  timezone: string | null;
  availability: string | null;
  bio: string | null;
  isProfileComplete: boolean;
}

export default function ContentProfileSetup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery<ContentProfile | null>({
    queryKey: ["/api/content-profile"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      specialty: profile?.specialty || "",
      contactHandle: profile?.contactHandle || "",
      contactType: profile?.contactType || "telegram",
      portfolioUrl: profile?.portfolioUrl || "",
      timezone: profile?.timezone || "",
      availability: profile?.availability || "",
      bio: profile?.bio || "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("POST", "/api/content-profile", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-access-status"] });
      toast({
        title: "Profile saved",
        description: "Your profile is complete. Welcome to Content Studio!",
      });
      setLocation("/content");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    submitMutation.mutate(data);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Tell us about yourself so we can better coordinate the team. This information helps us assign tasks and communicate effectively.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Your Role / Specialty *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-specialty">
                          <SelectValue placeholder="What do you do?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {specialties.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Preferred Contact Method *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contact-type">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contactTypes.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactHandle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Handle *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="@yourhandle" 
                          {...field}
                          data-testid="input-contact-handle"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Your Timezone *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timezone">
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This helps coordinate deadlines across the team
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Availability
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-availability">
                          <SelectValue placeholder="How much time can you dedicate?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availabilityOptions.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="portfolioUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Portfolio / Website
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://yourportfolio.com" 
                        {...field}
                        data-testid="input-portfolio"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional - share your work or personal website
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Short Bio
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us a bit about yourself and your experience..."
                        rows={3}
                        {...field}
                        data-testid="textarea-bio"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional - a brief introduction for the team
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={submitMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Complete Profile & Continue
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
