import { defineStore } from 'pinia'
import { createResource } from 'frappe-ui'
import { sessionStore } from './session'
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'

export const usersStore = defineStore('crm-users', () => {
  const session = sessionStore()

  let usersByName = reactive({})
  const router = useRouter()

  const users = createResource({
    url: 'crm.api.session.get_users',
    cache: 'crm-users',
    initialData: [],
    auto: true,
    transform([allUsers, crmUsers]) {
      for (let user of allUsers) {
        usersByName[user.name] = user
        if (user.name === 'Administrator') {
          usersByName[user.email] = user
        }
      }
      return { allUsers, crmUsers }
    },
    onError(error) {
      if (error && error.exc_type === 'AuthenticationError') {
        router.push('/login')
      }
    },
  })

  function getUser(email) {
    if (!email || email === 'sessionUser') {
      email = session.user
    }
    if (!usersByName[email]) {
      usersByName[email] = {
        name: email,
        email: email,
        full_name: email.split('@')[0],
        first_name: email.split('@')[0],
        last_name: '',
        user_image: null,
        role: null,
      }
    }
    return usersByName[email]
  }

  function isAdmin(email) {
    return getUser(email).role === 'System Manager'
  }

  function isManager(email) {
    return getUser(email).role === 'Sales Manager' || isAdmin(email)
  }

  // Sprint 10 (Svasamm fork patch) — admin-tier role check.
  //
  // Used by Field.vue to gate the picker "+ Create new" option on
  // master-list doctypes (Territory / CRM Industry / Industry Segment)
  // where non-admin users should pick from existing values rather than
  // create new ones.
  //
  // Reads the full `roles` array from crm.api.session.get_users — the
  // primary `role` field only carries the top-of-ladder rank and misses
  // sub-role inheritance (a profile that inherits Sales User as a base
  // and adds an admin role on top would still return Sales User as
  // .role). Falls back to the primary `role` if `roles` is missing.
  //
  // Role list intentionally permissive — extra entries beyond the stock
  // Frappe CRM trio (System Manager / Administrator / Sales Manager)
  // are safe no-ops on deployments where those roles don't exist as
  // records. Client forks should extend this list when introducing new
  // admin-tier roles.
  function canCreateMasters(email) {
    const u = getUser(email)
    const adminRoles = [
      // Stock Frappe CRM admin tier — present in every deployment.
      'System Manager',
      'Administrator',
      'Sales Manager',
      // Distributor-management add-on roles (DMS / videojet_override).
      // Dead entries on stock CRM-only deployments — these role names
      // don't exist as records there, so the .includes() never matches.
      'OEM Admin',
      'OEM Sales Admin',
    ]
    const roles = u.roles || (u.role ? [u.role] : [])
    return roles.some((r) => adminRoles.includes(r))
  }

  // DMS / videojet_override deployments map each user to either a Distributor
  // (Distributor Admin / Distributor Sales User / ...) or the OEM/tenant admin
  // tier. On stock CRM-only deployments these role names don't exist, so
  // isDistributor() is always false and isOEM() falls back to the admin tier.
  function isOEM(email) {
    const u = getUser(email)
    const oemRoles = [
      'System Manager',
      'Administrator',
      'OEM Admin',
      'OEM Sales Admin',
    ]
    const roles = u.roles || (u.role ? [u.role] : [])
    return roles.some((r) => oemRoles.includes(r))
  }

  // A distributor user carries a Distributor role and is NOT in the OEM/admin
  // tier. (Super-admin accounts can hold both Distributor and OEM roles — they
  // are treated as OEM, mirroring dms._is_oem_user.)
  function isDistributor(email) {
    const u = getUser(email)
    const roles = u.roles || (u.role ? [u.role] : [])
    return roles.some((r) => r.startsWith('Distributor')) && !isOEM(email)
  }

  function isWebsiteUser(email) {
    return getUser(email).user_type === 'Website User'
  }

  function isSalesUser(email) {
    return getUser(email).role === 'Sales User'
  }

  function isTelephonyAgent(email) {
    return getUser(email).is_telphony_agent
  }

  function getUserRole(email) {
    const user = getUser(email)
    if (user && user.role) {
      return user.role
    }
    return null
  }

  const isCrmUser = (user) => {
    user = user || session.user
    return users.data.crmUsers?.find((u) => u.name === user)
  }

  return {
    users,
    allUsers: computed(() => users.data.allUsers),
    crmUsers: computed(() => users.data.crmUsers),
    getUser,
    isAdmin,
    isManager,
    canCreateMasters,
    isSalesUser,
    isTelephonyAgent,
    getUserRole,
    isWebsiteUser,
    isDistributor,
    isOEM,
    isCrmUser,
  }
})
