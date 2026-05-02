'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Child {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface PickupNoticeFormProps {
  activityDayId: string;
  childrenList: Child[];
  users: User[];
  existingNotice?: {
    id: string;
    childId: string;
    alternatePersonUserId: string | null;
    alternatePersonName: string | null;
    description: string;
  } | null;
  onSuccess?: () => void;
}

export function PickupNoticeForm({
  activityDayId,
  childrenList,
  users,
  existingNotice,
  onSuccess,
}: PickupNoticeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usePersonField, setUsePersonField] = useState(
    !!existingNotice?.alternatePersonName
  );

  const [formData, setFormData] = useState({
    childId:
      existingNotice?.childId ||
      (childrenList.length === 1 ? childrenList[0].id : ''),
    alternatePersonUserId: existingNotice?.alternatePersonUserId || '',
    alternatePersonName: existingNotice?.alternatePersonName || '',
    description: existingNotice?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.childId) {
      newErrors.childId = 'Please select a child';
    }

    if (!formData.description) {
      newErrors.description = 'Description is required';
    }

    if (usePersonField && !formData.alternatePersonName) {
      newErrors.alternatePersonName = 'Please enter a name';
    }

    if (!usePersonField && !formData.alternatePersonUserId) {
      newErrors.alternatePersonUserId = 'Please select a contact';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const payload = {
        childId: formData.childId,
        alternatePersonUserId: usePersonField
          ? null
          : formData.alternatePersonUserId || null,
        alternatePersonName: usePersonField
          ? formData.alternatePersonName
          : null,
        description: formData.description,
      };

      const endpoint = existingNotice
        ? `/api/pickup-notices/${existingNotice.id}`
        : `/api/activity-days/${activityDayId}/pickup-notices`;

      const method = existingNotice ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save notice');
      }

      toast({
        title: existingNotice ? 'Notice updated' : 'Notice created',
        description: 'Successfully saved pickup notice',
      });

      onSuccess?.();
      if (!onSuccess) {
        router.refresh();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingNotice || !confirm('Delete this notice?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/pickup-notices/${existingNotice.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete notice');
      }

      toast({
        title: 'Notice deleted',
      });

      onSuccess?.();
      if (!onSuccess) {
        router.refresh();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Child *</label>
        <Select
          value={formData.childId}
          onValueChange={(value) =>
            setFormData({ ...formData, childId: value })
          }
          disabled={!!existingNotice}
        >
          <SelectTrigger className={errors.childId ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select a child" />
          </SelectTrigger>
          <SelectContent>
            {childrenList.map((child) => (
              <SelectItem key={child.id} value={child.id}>
                {child.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.childId && (
          <p className="text-sm text-red-500 mt-1">{errors.childId}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Who is picking up?</label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setUsePersonField(false)}
            className={`px-4 py-2 rounded ${
              !usePersonField ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Select from contacts
          </button>
          <button
            type="button"
            onClick={() => setUsePersonField(true)}
            className={`px-4 py-2 rounded ${
              usePersonField ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Enter name
          </button>
        </div>
      </div>

      {!usePersonField ? (
        <div>
          <label className="block text-sm font-medium mb-2">Contact *</label>
          <Select
            value={formData.alternatePersonUserId}
            onValueChange={(value) =>
              setFormData({ ...formData, alternatePersonUserId: value })
            }
          >
            <SelectTrigger
              className={errors.alternatePersonUserId ? 'border-red-500' : ''}
            >
              <SelectValue placeholder="Select a contact" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.alternatePersonUserId && (
            <p className="text-sm text-red-500 mt-1">
              {errors.alternatePersonUserId}
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-2">Name *</label>
          <Input
            value={formData.alternatePersonName}
            onChange={(e) =>
              setFormData({
                ...formData,
                alternatePersonName: e.target.value,
              })
            }
            placeholder="e.g., Tía María, family friend"
            className={errors.alternatePersonName ? 'border-red-500' : ''}
          />
          {errors.alternatePersonName && (
            <p className="text-sm text-red-500 mt-1">
              {errors.alternatePersonName}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Description *</label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Why they're picking up, any special notes..."
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !formData.childId}>
          {loading ? 'Saving...' : 'Save Notice'}
        </Button>
        {existingNotice && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
