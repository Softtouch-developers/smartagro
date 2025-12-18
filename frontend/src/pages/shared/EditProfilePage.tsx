// @ts-nocheck
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import {
    Button,
    Input,
    Select,
    ConfirmDialog,
    LoadingPage,
} from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/stores/uiStore';
import { authApi } from '@/services/api';
import { getErrorMessage } from '@/services/api/client';
import { REGIONS, DISTRICTS } from '@/utils/constants';

interface EditProfileFormData {
    full_name: string;
    email: string;
    phone_number: string;
    region: string;
    district: string;
    town_city: string;
    gps_address: string;
    // Farmer specific
    farm_name?: string;
    farm_size_acres?: number;
    years_farming?: number;
}

const EditProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { user, loadUser } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<EditProfileFormData>({
        defaultValues: {
            full_name: user?.full_name || '',
            email: user?.email || '',
            phone_number: user?.phone_number || '',
            region: user?.region || '',
            district: user?.district || '',
            town_city: user?.town_city || '',
            gps_address: user?.gps_address || '',
            farm_name: user?.farm_name || '',
            farm_size_acres: user?.farm_size_acres || undefined,
            years_farming: user?.years_farming || undefined,
        },
    });

    const selectedRegion = watch('region');

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const onSubmit = async (data: EditProfileFormData) => {
        setIsSubmitting(true);
        try {
            // Filter out empty strings for optional fields
            const updateData: any = { ...data };
            if (!updateData.farm_name) delete updateData.farm_name;
            if (!updateData.farm_size_acres) delete updateData.farm_size_acres;
            if (!updateData.years_farming) delete updateData.years_farming;

            await authApi.updateProfile(updateData);
            await loadUser(); // Reload user data
            toast.success('Profile updated successfully');
            navigate('/profile');
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await authApi.deleteAccount();
            useAuthStore.getState().logout(); // Clear local state
            toast.success('Account deleted successfully');
            navigate('/welcome');
        } catch (error) {
            toast.error(getErrorMessage(error));
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    if (!user) return <LoadingPage />;

    const isFarmer = user.user_type === 'FARMER';

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                        <h2 className="font-semibold text-gray-900 border-b pb-2">
                            Personal Information
                        </h2>

                        <Input
                            label="Full Name"
                            {...register('full_name', { required: 'Full name is required' })}
                            error={errors.full_name?.message}
                        />

                        <Input
                            label="Email Address"
                            type="email"
                            {...register('email')}
                            error={errors.email?.message}
                            disabled // Email usually shouldn't be changed easily without verification
                            helperText="Contact support to change email"
                        />

                        <Input
                            label="Phone Number"
                            type="tel"
                            {...register('phone_number')}
                            error={errors.phone_number?.message}
                            disabled // Phone is identity
                            helperText="Contact support to change phone number"
                        />
                    </div>

                    {/* Location */}
                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                        <h2 className="font-semibold text-gray-900 border-b pb-2">
                            Location
                        </h2>

                        <Select
                            label="Region"
                            {...register('region', { required: 'Region is required' })}
                            error={errors.region?.message}
                            options={REGIONS.map(r => ({ value: r, label: r }))}
                            onChange={(value) => {
                                setValue('region', value);
                                setValue('district', ''); // Reset district when region changes
                            }}
                        />

                        <Select
                            label="District"
                            {...register('district', { required: 'District is required' })}
                            error={errors.district?.message}
                            options={
                                selectedRegion && DISTRICTS[selectedRegion as keyof typeof DISTRICTS]
                                    ? DISTRICTS[selectedRegion as keyof typeof DISTRICTS].map(d => ({ value: d, label: d }))
                                    : []
                            }
                            disabled={!selectedRegion}
                        />

                        <Input
                            label="Town / City"
                            {...register('town_city', { required: 'Town/City is required' })}
                            error={errors.town_city?.message}
                        />

                        <Input
                            label="GPS Address"
                            {...register('gps_address')}
                            placeholder="e.g. AK-039-2029"
                            error={errors.gps_address?.message}
                        />
                    </div>

                    {/* Farmer Specific Details */}
                    {isFarmer && (
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            <h2 className="font-semibold text-gray-900 border-b pb-2">
                                Farm Details
                            </h2>

                            <Input
                                label="Farm Name"
                                {...register('farm_name')}
                                placeholder="e.g. Green Valley Farms"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Farm Size (Acres)"
                                    type="number"
                                    step="0.1"
                                    {...register('farm_size_acres', { valueAsNumber: true })}
                                />

                                <Input
                                    label="Years Farming"
                                    type="number"
                                    {...register('years_farming', { valueAsNumber: true })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-4 flex flex-col gap-4">
                        <Button
                            type="submit"
                            size="lg"
                            fullWidth
                            isLoading={isSubmitting}
                            leftIcon={<Save className="w-5 h-5" />}
                        >
                            Save Changes
                        </Button>

                        <button
                            type="button"
                            onClick={() => setShowDeleteDialog(true)}
                            className="flex items-center justify-center gap-2 text-red-600 font-medium py-3 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                            Delete Account
                        </button>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteAccount}
                title="Delete Account"
                message="Are you sure you want to delete your account? This action cannot be undone and you will lose all your data."
                confirmText="Delete Account"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
};

export default EditProfilePage;
