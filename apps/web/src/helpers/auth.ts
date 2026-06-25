export const __appToken = 'APP_TOKEN';
export const __appBearer = 'APP_BEARER';
export const __appUser = 'APP_USER';
export const __appMerchant = 'APP_MERCHANT';
export const __appRoles = 'APP_ROLES';
export const __appActiveRole = 'APP_ACTIVE_ROLE';
export const __appPermissions = 'APP_ACTIVE_PERMISSIONS';
export const __appIsLogin = 'APP_IS_LOGIN';

export const setAuth = (data: any) => {
  localStorage.setItem(__appIsLogin, 'true');
  localStorage.setItem(__appToken, data?.access_token || '');
  localStorage.setItem(__appBearer, data?.token_type || '');

  // User & Merchant
  const user = data?.user || '';
  const merchant = user?.merchant || '';

  delete user.merchant;
  delete user.merchant_id;

  localStorage.setItem(__appUser, JSON.stringify(user));
  localStorage.setItem(__appMerchant, JSON.stringify(merchant));

  // Extract roles and permissions from RBAC
  // In the flat structure, rbac is an array of roles, e.g., [{ role: { id, name, description, permissions: [...] } }]
  const rbacList = data?.rbac || [];
  const roles = rbacList.map((item: any) => ({
    id: item.role?.id,
    name: item.role?.name,
    description: item.role?.description,
  }));
  localStorage.setItem(__appRoles, JSON.stringify(roles));

  const activeRbac = rbacList[0] || {};
  const activeRole = activeRbac.role || {};
  const permissions = activeRole.permissions?.map((p: any) => p.code) || [];

  delete activeRole.permissions;

  localStorage.setItem(__appPermissions, JSON.stringify(permissions));
  localStorage.setItem(__appActiveRole, JSON.stringify(activeRole));
}

export const getToken = () => {
  return localStorage.getItem(__appToken) || '';
}

export const getUser = () => {
  const localUser = localStorage.getItem(__appUser) || '';
  return localUser ? JSON.parse(localUser) : {};
}

export const getMerchant = () => {
  const localMerchant = localStorage.getItem(__appMerchant) || '';
  return localMerchant ? JSON.parse(localMerchant) : {};
}

export const getRolesList = () => {
  const localRoles = localStorage.getItem(__appRoles) || '';
  return localRoles ? JSON.parse(localRoles) : [];
}

export const getRole = () => {
  const localRole = localStorage.getItem(__appActiveRole) || '';
  return localRole ? JSON.parse(localRole) : {};
}

export const isUserNotAdmin = () => {
  const { name } = getRole();
  const whiteListRoles = ['admin', 'superadmin'];
  return !whiteListRoles.includes(name);
}

export const getPermissions = () => {
  const localPermissions = localStorage.getItem(__appPermissions) || '';
  return localPermissions ? JSON.parse(localPermissions) : [];
}

export const isHasPermission = (permission: string) => {
  const defaultOfPermissions: string[] = ['dashboard.view'];
  const permissions = [...getPermissions(), ...defaultOfPermissions];
  return permissions.includes(permission);
}

export const isLogin = () => {
  return localStorage.getItem(__appIsLogin) || '';
}

export const getPersonalInformation = () => {
  return {
    user: getUser(),
    role: getRole(),
    merchant: getMerchant(),
    permissions: getPermissions(),
  };
}

export const removeAuth = () => {
  localStorage.removeItem(__appToken);
  localStorage.removeItem(__appUser);
  localStorage.removeItem(__appActiveRole);
  localStorage.removeItem(__appMerchant);
  localStorage.removeItem(__appRoles);
  localStorage.removeItem(__appPermissions);
  localStorage.removeItem(__appIsLogin);
}
