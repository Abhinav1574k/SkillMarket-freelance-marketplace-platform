const API = "/api";

let currentUser = null;
let currentGig = null;
let authMode = "login";

const token = localStorage.getItem("marketplace_token");

if (token) {
  loadCurrentUser();
}

document.addEventListener("DOMContentLoaded", () => {
  loadGigs();
});


/* =========================
   API HELPER
========================= */

async function api(url, options = {}) {

  const token = localStorage.getItem("marketplace_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API}${url}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "Something went wrong"
    );
  }

  return data;
}


/* =========================
   AUTH
========================= */

async function loadCurrentUser() {

  try {

    const user = await api("/auth/me");

    currentUser = user;

    updateNavbar();

  } catch (error) {

    localStorage.removeItem("marketplace_token");

    currentUser = null;

    updateNavbar();
  }
}


function updateNavbar() {

  const loginBtn =
    document.getElementById("loginBtn");

  const registerBtn =
    document.getElementById("registerBtn");

  const userMenu =
    document.getElementById("userMenu");

  const dashboardNav =
    document.getElementById("dashboardNav");

  if (currentUser) {

    loginBtn.classList.add("hidden");
    registerBtn.classList.add("hidden");

    userMenu.classList.remove("hidden");

    dashboardNav.classList.remove("hidden");

    document.getElementById("navUserName").textContent =
      currentUser.name.split(" ")[0];

    document.getElementById("userAvatar").textContent =
      currentUser.name.charAt(0).toUpperCase();

  } else {

    loginBtn.classList.remove("hidden");
    registerBtn.classList.remove("hidden");

    userMenu.classList.add("hidden");

    dashboardNav.classList.add("hidden");
  }
}


function openAuthModal(mode = "login") {

  authMode = mode;

  const modal =
    document.getElementById("authModal");

  modal.classList.remove("hidden");

  updateAuthModal();

}


function closeAuthModal() {

  document
    .getElementById("authModal")
    .classList.add("hidden");

}


function switchAuthMode() {

  authMode =
    authMode === "login"
      ? "register"
      : "login";

  updateAuthModal();

}


function updateAuthModal() {

  const register =
    authMode === "register";

  document.getElementById("authTitle").textContent =
    register
      ? "Create your account"
      : "Welcome back";

  document.getElementById("authSubtitle").textContent =
    register
      ? "Join the freelance marketplace."
      : "Login to continue.";

  document.getElementById("authSubmit").textContent =
    register
      ? "Create Account"
      : "Log In";

  document.getElementById("nameField")
    .classList.toggle("hidden", !register);

  document.getElementById("roleField")
    .classList.toggle("hidden", !register);

  document.getElementById("authSwitchText").textContent =
    register
      ? "Already have an account?"
      : "Don't have an account?";

  document.getElementById("authSwitchButton").textContent =
    register
      ? "Log in"
      : "Create one";
}


async function handleAuth(event) {

  event.preventDefault();

  const email =
    document.getElementById("authEmail").value.trim();

  const password =
    document.getElementById("authPassword").value;

  try {

    let data;

    if (authMode === "register") {

      const name =
        document.getElementById("authName").value.trim();

      const role =
        document.getElementById("authRole").value;

      if (!name) {
        throw new Error("Please enter your name");
      }

      data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          role
        })
      });

    } else {

      data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password
        })
      });

    }

    localStorage.setItem(
      "marketplace_token",
      data.token
    );

    currentUser = data.user;

    closeAuthModal();

    document.getElementById("authForm").reset();

    updateNavbar();

    showToast(
      authMode === "login"
        ? "Welcome back!"
        : "Account created successfully!"
    );

  } catch (error) {

    showToast(error.message, true);

  }

}


function logout() {

  localStorage.removeItem("marketplace_token");

  currentUser = null;

  updateNavbar();

  showHome();

  showToast("You have been logged out.");

}


function toggleUserMenu() {

  document
    .getElementById("userDropdown")
    .classList.toggle("hidden");

}


/* =========================
   GIGS
========================= */

async function loadGigs() {

  const grid =
    document.getElementById("gigGrid");

  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:50px;color:#7c778d">
      Loading services...
    </div>
  `;

  const search =
    document.getElementById("searchInput").value.trim();

  const category =
    document.getElementById("categoryFilter").value;

  const price =
    document.getElementById("priceFilter").value;

  let minPrice = "";
  let maxPrice = "";

  if (price) {

    const parts = price.split("-");

    minPrice = parts[0];
    maxPrice = parts[1];

  }

  try {

    const params = new URLSearchParams();

    if (search) {
      params.set("search", search);
    }

    if (category) {
      params.set("category", category);
    }

    if (minPrice) {
      params.set("minPrice", minPrice);
    }

    if (maxPrice) {
      params.set("maxPrice", maxPrice);
    }

    const gigs =
      await api(`/gigs?${params.toString()}`);

    renderGigs(gigs);

  } catch (error) {

    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:50px;color:#e44f62">
        Failed to load services.
      </div>
    `;

  }

}


function renderGigs(gigs) {

  const grid =
    document.getElementById("gigGrid");

  const empty =
    document.getElementById("emptyState");

  const resultsInfo =
    document.getElementById("resultsInfo");

  resultsInfo.textContent =
    `${gigs.length} service${gigs.length !== 1 ? "s" : ""} found`;

  if (!gigs.length) {

    grid.innerHTML = "";

    empty.classList.remove("hidden");

    return;
  }

  empty.classList.add("hidden");

  grid.innerHTML =
    gigs.map(gig => createGigCard(gig)).join("");

}


function createGigCard(gig) {

  const image =
    gig.image ||
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2";

  const initials =
    gig.freelancer_name
      .split(" ")
      .map(word => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  return `
    <article class="gig-card">

      <img
        class="gig-image"
        src="${escapeHtml(image)}"
        alt="${escapeHtml(gig.title)}"
        onerror="this.src='https://images.unsplash.com/photo-1497366811353-6870744d04b2'"
      >

      <div class="gig-content">

        <span class="gig-category">
          ${escapeHtml(gig.category)}
        </span>

        <h3 class="gig-title">
          ${escapeHtml(gig.title)}
        </h3>

        <p class="gig-description">
          ${escapeHtml(gig.description)}
        </p>

        <div class="freelancer">

          <div class="freelancer-avatar">
            ${initials}
          </div>

          <div class="freelancer-name">
            ${escapeHtml(gig.freelancer_name)}
          </div>

        </div>

        <div class="gig-footer">

          <div class="gig-price">

            <small>
              Starting at
            </small>

            <strong>
              ₹${Number(gig.price).toLocaleString("en-IN")}
            </strong>

          </div>

          <div class="delivery">
            <i class="fa-regular fa-clock"></i>
            ${gig.delivery_days} days
          </div>

          ${
            currentUser?.role === "client"
              ? `
                <button
                  class="btn btn-primary"
                  onclick="openOrderModal(${gig.id})"
                >
                  Order
                </button>
              `
              : ""
          }

        </div>

      </div>

    </article>
  `;
}


/* =========================
   SEARCH
========================= */

function syncSearch(value) {

  document.getElementById("searchInput").value =
    value;

}


function searchFromHero() {

  const value =
    document.getElementById("heroSearch").value.trim();

  document.getElementById("searchInput").value =
    value;

  loadGigs();

  document
    .querySelector(".marketplace")
    .scrollIntoView({
      behavior: "smooth"
    });

}


function quickSearch(category) {

  document.getElementById("searchInput").value =
    category;

  document.getElementById("heroSearch").value =
    category;

  loadGigs();

  document
    .querySelector(".marketplace")
    .scrollIntoView({
      behavior: "smooth"
    });

}


function clearFilters() {

  document.getElementById("searchInput").value = "";

  document.getElementById("heroSearch").value = "";

  document.getElementById("categoryFilter").value = "";

  document.getElementById("priceFilter").value = "";

  loadGigs();

}


/* =========================
   ORDER
========================= */

async function openOrderModal(gigId) {

  if (!currentUser) {

    showToast(
      "Please login as a client to place an order.",
      true
    );

    openAuthModal("login");

    return;
  }

  if (currentUser.role !== "client") {

    showToast(
      "Only client accounts can place orders.",
      true
    );

    return;
  }

  try {

    currentGig =
      await api(`/gigs/${gigId}`);

    document.getElementById("orderGigInfo").innerHTML = `
      <strong>
        ${escapeHtml(currentGig.title)}
      </strong>

      <span>
        ${escapeHtml(currentGig.freelancer_name)}
        · ₹${Number(currentGig.price).toLocaleString("en-IN")}
        · ${currentGig.delivery_days} days
      </span>
    `;

    document
      .getElementById("orderRequirements")
      .value = "";

    document
      .getElementById("orderModal")
      .classList.remove("hidden");

  } catch (error) {

    showToast(error.message, true);

  }

}


function closeOrderModal() {

  document
    .getElementById("orderModal")
    .classList.add("hidden");

}


async function placeOrder(event) {

  event.preventDefault();

  if (!currentGig) return;

  const requirements =
    document
      .getElementById("orderRequirements")
      .value
      .trim();

  try {

    await api("/orders", {
      method: "POST",

      body: JSON.stringify({
        gig_id: currentGig.id,
        requirements
      })
    });

    closeOrderModal();

    showToast(
      "Order placed successfully!"
    );

    showDashboard();

  } catch (error) {

    showToast(error.message, true);

  }

}


/* =========================
   DASHBOARD
========================= */

async function showDashboard() {

  if (!currentUser) {

    openAuthModal("login");

    return;
  }

  document
    .querySelector(".marketplace")
    .classList.add("hidden");

  document
    .querySelector(".hero")
    .classList.add("hidden");

  document
    .getElementById("dashboardSection")
    .classList.remove("hidden");

  document
    .getElementById("userDropdown")
    .classList.add("hidden");

  if (currentUser.role === "freelancer") {

    document.getElementById("dashboardTitle").textContent =
      "Freelancer Dashboard";

    document.getElementById("dashboardSubtitle").textContent =
      "Manage your services, orders and earnings.";

    document
      .getElementById("freelancerActions")
      .classList.remove("hidden");

    await loadFreelancerDashboard();

  } else {

    document.getElementById("dashboardTitle").textContent =
      "Client Dashboard";

    document.getElementById("dashboardSubtitle").textContent =
      "Track your projects and orders.";

    document
      .getElementById("freelancerActions")
      .classList.add("hidden");

    await loadClientDashboard();

  }

}


function showHome() {

  document
    .querySelector(".hero")
    .classList.remove("hidden");

  document
    .querySelector(".marketplace")
    .classList.remove("hidden");

  document
    .getElementById("dashboardSection")
    .classList.add("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


async function loadFreelancerDashboard() {

  try {

    const stats =
      await api("/dashboard/freelancer");

    document.getElementById("dashboardStats").innerHTML = `

      <div class="stat-card">

        <div class="stat-icon">
          <i class="fa-solid fa-briefcase"></i>
        </div>

        <strong>
          ${stats.gigs}
        </strong>

        <span>
          Active Gigs
        </span>

      </div>


      <div class="stat-card">

        <div class="stat-icon">
          <i class="fa-solid fa-cart-shopping"></i>
        </div>

        <strong>
          ${stats.orders}
        </strong>

        <span>
          Total Orders
        </span>

      </div>


      <div class="stat-card">

        <div class="stat-icon">
          <i class="fa-solid fa-circle-check"></i>
        </div>

        <strong>
          ${stats.completed}
        </strong>

        <span>
          Completed
        </span>

      </div>


      <div class="stat-card">

        <div class="stat-icon">
          <i class="fa-solid fa-indian-rupee-sign"></i>
        </div>

        <strong>
          ₹${Number(stats.earnings).toLocaleString("en-IN")}
        </strong>

        <span>
          Earnings
        </span>

      </div>

    `;

    const orders =
      await api("/orders/freelancer");

    renderOrders(orders, "freelancer");

  } catch (error) {

    showToast(error.message, true);

  }

}


async function loadClientDashboard() {

  try {

    const stats =
      await api("/dashboard/client");

    document.getElementById("dashboardStats").innerHTML = `

      <div class="stat-card">

        <div class="stat-icon">
          <i class="fa-solid fa-cart-shopping"></i>
        </div>

        <strong>
          ${stats.orders}
        </strong>

        <span>
          Total Orders
        </span>

      </div>


      <div class="stat-card">

        <div class="stat-icon">
          <i class="fa-solid fa-spinner"></i>
        </div>

        <strong>
          ${stats.active}
        </strong>

        <span>
          Active Projects
        </span>

      </div>


      <div class="stat-card">

        <div class="stat-icon">
          <i class="fa-solid fa-circle-check"></i>
        </div>

        <strong>
          ${stats.completed}
        </strong>

        <span>
          Completed
        </span>

      </div>


      <div class="stat-card">

        <div class="stat-icon">
          <i class="fa-solid fa-indian-rupee-sign"></i>
        </div>

        <strong>
          ₹${Number(stats.spending).toLocaleString("en-IN")}
        </strong>

        <span>
          Total Spending
        </span>

      </div>

    `;

    const orders =
      await api("/orders/client");

    renderOrders(orders, "client");

  } catch (error) {

    showToast(error.message, true);

  }

}


function renderOrders(orders, role) {

  const container =
    document.getElementById("ordersContainer");

  if (!orders.length) {

    container.innerHTML = `
      <div style="padding:45px;text-align:center;color:#7c778d">
        <i
          class="fa-solid fa-inbox"
          style="font-size:30px;margin-bottom:12px"
        ></i>

        <p>
          No orders yet.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    orders.map(order => {

      let actions = "";

      if (role === "freelancer") {

        if (order.status === "pending") {

          actions += `
            <button
              class="small-btn"
              onclick="updateOrderStatus(${order.id}, 'in_progress')"
            >
              Start Work
            </button>

            <button
              class="small-btn"
              onclick="updateOrderStatus(${order.id}, 'cancelled')"
            >
              Cancel
            </button>
          `;

        } else if (order.status === "in_progress") {

          actions += `
            <button
              class="small-btn"
              onclick="updateOrderStatus(${order.id}, 'delivered')"
            >
              Mark Delivered
            </button>

            <button
              class="small-btn"
              onclick="updateOrderStatus(${order.id}, 'cancelled')"
            >
              Cancel
            </button>
          `;

        }

      } else {

        if (order.status === "delivered") {

          actions += `
            <button
              class="small-btn"
              onclick="updateOrderStatus(${order.id}, 'completed')"
            >
              Accept Delivery
            </button>
          `;

        }

        if (
          order.status === "pending" ||
          order.status === "in_progress"
        ) {

          actions += `
            <button
              class="small-btn"
              onclick="updateOrderStatus(${order.id}, 'cancelled')"
            >
              Cancel
            </button>
          `;

        }

      }

      const otherPerson =
        role === "freelancer"
          ? order.client_name
          : order.freelancer_name;

      return `
        <div class="order-item">

          <div class="order-main">

            <h4>
              ${escapeHtml(order.gig_title)}
            </h4>

            <p>
              ${role === "freelancer" ? "Client" : "Freelancer"}:
              ${escapeHtml(otherPerson)}
            </p>

            <p>
              Order #${order.id}
            </p>

          </div>

          <div>

            <span
              class="status status-${order.status}"
            >
              ${formatStatus(order.status)}
            </span>

          </div>

          <div class="order-price">
            ₹${Number(order.price).toLocaleString("en-IN")}
          </div>

          <div class="order-actions">
            ${actions}
          </div>

        </div>
      `;

    }).join("");

}


async function updateOrderStatus(orderId, status) {

  try {

    await api(
      `/orders/${orderId}/status`,
      {
        method: "PATCH",

        body: JSON.stringify({
          status
        })
      }
    );

    showToast(
      "Order status updated."
    );

    showDashboard();

  } catch (error) {

    showToast(error.message, true);

  }

}


/* =========================
   CREATE GIG
========================= */

function openGigModal() {

  document
    .getElementById("gigModal")
    .classList.remove("hidden");

}


function closeGigModal() {

  document
    .getElementById("gigModal")
    .classList.add("hidden");

}


async function createGig(event) {

  event.preventDefault();

  try {

    const title =
      document.getElementById("gigTitle").value.trim();

    const category =
      document.getElementById("gigCategory").value;

    const price =
      document.getElementById("gigPrice").value;

    const delivery_days =
      document.getElementById("gigDelivery").value;

    const image =
      document.getElementById("gigImage").value.trim();

    const description =
      document.getElementById("gigDescription").value.trim();

    await api("/gigs", {
      method: "POST",

      body: JSON.stringify({
        title,
        description,
        category,
        price,
        delivery_days,
        image
      })
    });

    closeGigModal();

    document
      .querySelector("#gigModal form")
      .reset();

    showToast(
      "Gig published successfully!"
    );

    loadGigs();

    showDashboard();

  } catch (error) {

    showToast(error.message, true);

  }

}


/* =========================
   HELPERS
========================= */

function formatStatus(status) {

  return status
    .replace("_", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());

}


function escapeHtml(value) {

  const div =
    document.createElement("div");

  div.textContent =
    value ?? "";

  return div.innerHTML;

}


function showToast(message, error = false) {

  const toast =
    document.getElementById("toast");

  const icon =
    document.getElementById("toastIcon");

  document.getElementById("toastMessage")
    .textContent = message;

  icon.className =
    error
      ? "fa-solid fa-circle-exclamation"
      : "fa-solid fa-check";

  toast.classList.add("show");

  setTimeout(() => {

    toast.classList.remove("show");

  }, 3000);

}