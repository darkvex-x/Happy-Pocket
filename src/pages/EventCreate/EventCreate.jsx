import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Button from '../../components/ui/Button';
import { StorageService } from '../../services/storage';
import { ROUTES } from '../../constants/routes';
import { validateEvent } from '../../utils/validation';
import { useToast } from '../../components/ui/Toast';
import { usePermissions } from '../../context/PermissionContext';
import { PERMISSIONS } from '../../services/permissions';

export default function EventCreate() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { permissions } = usePermissions();

  const [formData, setFormData] = useState({
    eventName: '',
    brideName: '',
    groomName: '',
    venue: '',
    functionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const canCreate = permissions.includes(PERMISSIONS.EDIT_EVENT);

  useEffect(() => {
    if (!canCreate) {
      navigate('/', { replace: true });
    }
  }, [canCreate, navigate]);

  if (!canCreate) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const { errors: newErrors, isValid } = validateEvent(formData);
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    
    if (!validate()) {
      addToast({
        type: 'error',
        title: 'Validation Failed',
        message: 'Please resolve the highlighted errors before saving.'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const sanitized = {
        eventName: formData.eventName.trim(),
        brideName: formData.brideName.trim(),
        groomName: formData.groomName.trim(),
        venue: formData.venue.trim(),
        functionDate: formData.functionDate,
        notes: formData.notes.trim()
      };
      const newEvent = await StorageService.createEvent(sanitized);
      addToast({
        type: 'success',
        title: 'Event Created',
        message: `Ledger "${sanitized.eventName}" created successfully!`
      });
      navigate(ROUTES.CURRENT_EVENT, { state: { eventId: newEvent.id } });
    } catch (err) {
      setGlobalError(err.message || 'Failed to save event. Please try again.');
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.message || 'An unexpected error occurred.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Event</h1>
        <p
          style={{ fontFamily: '"Lemon",Aerial' }}
          className="text-gray-500 dark:text-gray-400 mt-1"
        >
          Set up a new ledger to start recording Moi transactions.
        </p>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-5">
          <CardTitle>Event Details</CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 pt-6">
            {globalError && (
              <div
                role="alert"
                className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium animate-in fade-in"
              >
                {globalError}
              </div>
            )}

            <div>
              <label
                htmlFor="eventNameInput"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Event Name{" "}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
              </label>
              <Input
                id="eventNameInput"
                name="eventName"
                placeholder="e.g., John & Jane Wedding"
                value={formData.eventName}
                onChange={handleChange}
                error={errors.eventName}
                disabled={isLoading}
                autoFocus
                aria-required="true"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="brideNameInput"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Bride Name
                </label>
                <Input
                  id="brideNameInput"
                  name="brideName"
                  placeholder="e.g., Priya"
                  value={formData.brideName}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label
                  htmlFor="groomNameInput"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Groom Name
                </label>
                <Input
                  id="groomNameInput"
                  name="groomName"
                  placeholder="e.g., Arjun"
                  value={formData.groomName}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="venueInput"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Venue
                </label>
                <Input
                  id="venueInput"
                  name="venue"
                  placeholder="e.g., Grand Palace Hall"
                  value={formData.venue}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label
                  htmlFor="functionDateInput"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Function Date
                </label>
                <Input
                  id="functionDateInput"
                  type="date"
                  name="functionDate"
                  value={formData.functionDate}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="notesInput"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Additional Notes
              </label>
              <TextArea
                id="notesInput"
                name="notes"
                placeholder="Any special remarks or details..."
                value={formData.notes}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-3 bg-gray-50/50 dark:bg-gray-800/20 py-4 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(ROUTES.DASHBOARD)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create Account Ledger
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
