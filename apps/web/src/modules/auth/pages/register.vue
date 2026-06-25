<template>
  <UiCard class="register-page">
    <Image :src="defaultLogo" alt="Image" class="w-44" />

    <div class="w-full pt-2">
      <Stepper v-model:value="activeStep" :linear="true" class="w-full">
        <StepList>
          <Step :value="1">User Info</Step>
          <Step :value="2">Merchant Info</Step>
        </StepList>

        <StepPanels>
          <!-- Step 1: User Information -->
          <StepPanel v-slot="{ activateCallback }" :value="1">
            <Form
              v-slot="$form"
              :resolver="userResolver"
              :initialValues="userFormValues"
              @submit="(e) => onUserFormSubmit(e, activateCallback)"
              class="flex flex-col gap-4 w-full pt-4"
            >
              <UiFormGroup label="Full Name" variant="vertical">
                <InputText
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  fluid
                  :disabled="loading"
                />
                <Message
                  v-if="$form.name?.invalid"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ $form.name.error?.message }}
                </Message>
              </UiFormGroup>

              <UiFormGroup label="Email" variant="vertical">
                <InputText
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  fluid
                  :disabled="loading"
                />
                <Message
                  v-if="$form.email?.invalid"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ $form.email.error?.message }}
                </Message>
              </UiFormGroup>

              <UiFormGroup label="Password" variant="vertical">
                <InputGroup>
                  <InputText
                    name="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Min. 6 characters"
                    fluid
                    :disabled="loading"
                  />
                  <InputGroupAddon>
                    <Button
                      :icon="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"
                      severity="secondary"
                      variant="text"
                      class="w-full"
                      @click="showPassword = !showPassword"
                    />
                  </InputGroupAddon>
                </InputGroup>
                <Message
                  v-if="$form.password?.invalid"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ $form.password.error?.message }}
                </Message>
              </UiFormGroup>

              <div class="w-full flex gap-2 pt-2">
                <Button
                  type="button"
                  severity="secondary"
                  label="Cancel"
                  class="w-full"
                  :disabled="loading"
                  @click="router.push('/')"
                />
                <Button
                  type="submit"
                  variant="primary"
                  label="Next"
                  class="w-full"
                  :disabled="loading"
                />
              </div>
            </Form>
          </StepPanel>

          <!-- Step 2: Merchant Information -->
          <StepPanel v-slot="{ activateCallback }" :value="2">
            <Form
              v-slot="$form"
              :resolver="merchantResolver"
              :initialValues="merchantFormValues"
              @submit="onMerchantFormSubmit"
              class="flex flex-col gap-4 w-full pt-4"
            >
              <UiFormGroup label="Merchant Name" variant="vertical">
                <InputText
                  name="name"
                  type="text"
                  placeholder="My Store"
                  fluid
                  :disabled="loading"
                  @update:modelValue="(value: any) => onMerchantNameChange(value, $form)"
                />
                <Message
                  v-if="$form.name?.invalid"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ $form.name.error?.message }}
                </Message>
              </UiFormGroup>

              <UiFormGroup label="Merchant Slug" variant="vertical">
                <InputText
                  name="slug"
                  type="text"
                  placeholder="my-store"
                  fluid
                  readonly
                  disabled
                />
                <Message
                  v-if="$form.slug?.invalid"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ $form.slug.error?.message }}
                </Message>
              </UiFormGroup>

              <UiFormGroup label="Phone (Optional)" variant="vertical">
                <InputText
                  name="phone"
                  type="text"
                  placeholder="08123456789"
                  fluid
                  :disabled="loading"
                />
                <Message
                  v-if="$form.phone?.invalid"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ $form.phone.error?.message }}
                </Message>
              </UiFormGroup>

              <UiFormGroup label="Address (Optional)" variant="vertical">
                <Textarea
                  name="address"
                  placeholder="Jl. Ahmad Yani No. 123"
                  rows="2"
                  fluid
                  :disabled="loading"
                />
                <Message
                  v-if="$form.address?.invalid"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ $form.address.error?.message }}
                </Message>
              </UiFormGroup>

              <div class="w-full flex gap-2 pt-2">
                <Button
                  type="button"
                  severity="secondary"
                  label="Back"
                  class="w-full"
                  :disabled="loading"
                  @click="activateCallback(1)"
                />
                <Button
                  type="submit"
                  variant="primary"
                  label="Register"
                  class="w-full"
                  :loading="loading"
                />
              </div>
            </Form>
          </StepPanel>
        </StepPanels>
      </Stepper>

      <div class="text-base text-gray-500 dark:text-gray-400 text-center">
        Already have an account?
        <router-link to="/" class="text-base text-blue-500 dark:text-blue-400 hover:underline">
          Sign In
        </router-link>
      </div>

      <div class="text-xs text-center text-gray-400 dark:text-gray-500 pt-4">
        Version 1.0.0
      </div>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { useRouter } from 'vue-router';
import { z } from 'zod';

import defaultLogo from '@/assets/insell-logo.png';

import { setAuth } from '@/helpers/auth.ts';
import { getErrorMessage } from '@/helpers/utils.ts';
import { showToast } from '@/helpers/toast.ts';
import { postRegister } from '@/modules/auth/services/api.ts';

import UiFormGroup from '@/components/UiFormGroup.vue';
import UiCard from '@/components/UiCard.vue';

import { PREFIX_ROUTE_PATH as PRP_DASHBOARD } from '@/modules/dashboard/services/constants.ts';

const router = useRouter();
const showPassword = ref(false);
const loading = ref(false);
const activeStep = ref(1);

const slugPattern = /^[a-z0-9-]+$/;

// Helper function to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// Step 1: User Information
const userFormValues = ref({
  name: '',
  email: '',
  password: ''
});

const userResolver = ref(zodResolver(
  z.object({
    name: z.string().min(1, { message: 'Full name is required.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }).min(1, { message: 'Email is required.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' })
  })
));

const onUserFormSubmit = ({ valid, values }: { valid: boolean; values: any }, activateCallback: (step: number) => void) => {
  if (valid) {
    userFormValues.value = values;
    activateCallback(2);
  }
};

// Step 2: Merchant Information
const merchantFormValues = ref({
  name: '',
  slug: '',
  phone: '',
  address: ''
});

const merchantResolver = ref(zodResolver(
  z.object({
    name: z.string().min(1, { message: 'Merchant name is required.' }),
    slug: z.string()
      .min(1, { message: 'Merchant slug is required.' })
      .regex(slugPattern, { message: 'Slug must only contain lowercase letters, numbers and hyphens.' }),
    phone: z.string().optional(),
    address: z.string().optional()
  })
));

const onMerchantNameChange = (name: string, form: any) => {
  const slug = generateSlug(name);
  form.slug.value = slug;
};

const onMerchantFormSubmit = async ({ valid, values }: { valid: boolean; values: any }) => {
  if (valid) {
    merchantFormValues.value = values;
    await submitRegistration();
  }
};

// Final Registration
const submitRegistration = async () => {
  loading.value = true;

  try {
    const payload = {
      name: userFormValues.value.name,
      email: userFormValues.value.email,
      password: userFormValues.value.password,
      merchant: {
        slug: merchantFormValues.value.slug,
        name: merchantFormValues.value.name,
        phone: merchantFormValues.value.phone || undefined,
        address: merchantFormValues.value.address || undefined
      }
    };

    const response = await postRegister(payload);
    const { success, data } = response?.data;

    if (success) {
      setAuth(data);

      router.push(PRP_DASHBOARD);
      showToast({
        type: 'success',
        title: 'Registration Success',
        message: 'Your account has been created successfully.',
      });
    }
  } catch (error) {
    showToast({
      type: 'error',
      title: 'Registration Failed.',
      message: getErrorMessage(error) || 'There was an error.',
    });
  } finally {
    loading.value = false;
  }
};
</script>
<style>
@import 'tailwindcss';

.register-page {
  @apply relative w-150 flex flex-col items-center h-screen md:h-auto overflow-y-auto py-8! px-2! rounded-none! md:rounded-lg!;
}

.register-page .p-step-title {
  @apply hidden! lg:block!;
}

/* Dark mode styling for StepPanel */
.dark .p-steppanel {
  background-color: var(--dark-bg);
  color: var(--dark-text);
}

.dark .p-steppanel-content {
  background-color: var(--dark-bg);
  color: var(--dark-text);
}
</style>
