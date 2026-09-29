/* ===== VividScope Cart ===== */
(function () {
  'use strict';

  const CART_KEY = 'vividscope_cart';

  const PRODUCTS = {
    'vs-200': { id: 'vs-200', name: 'VS-200 Student Microscope', price: 249, category: 'Compound', icon: '🔬' },
    'vs-400': { id: 'vs-400', name: 'VS-400 Advanced Compound', price: 549, category: 'Compound', icon: '🔬' },
    'vs-stereo-40': { id: 'vs-stereo-40', name: 'VS-Stereo 40', price: 389, category: 'Stereo', icon: '🔬' },
    'vs-stereo-90': { id: 'vs-stereo-90', name: 'VS-Stereo Zoom 90', price: 1150, category: 'Stereo', icon: '🔬' },
    'vs-digital-pro': { id: 'vs-digital-pro', name: 'VS-Digital Pro 5MP', price: 799, category: 'Digital', icon: '🔬' },
    'vs-tablet': { id: 'vs-tablet', name: 'VS-Tablet Microscope', price: 1299, category: 'Digital', icon: '🔬' },
    'vs-research': { id: 'vs-research', name: 'VS-Research Infinity', price: 2450, category: 'Research', icon: '🔬' },
    'vs-fluorescence': { id: 'vs-fluorescence', name: 'VS-Fluorescence System', price: 8900, category: 'Research', icon: '🔬' },
    'cam-5mp': { id: 'cam-5mp', name: '5MP USB Camera Kit', price: 189, category: 'Accessories', icon: '📷' },
    'led-upgrade': { id: 'led-upgrade', name: 'LED Illumination Upgrade', price: 129, category: 'Accessories', icon: '💡' },
    'slides-50': { id: 'slides-50', name: 'Prepared Slide Set (50)', price: 79, category: 'Accessories', icon: '📦' },
    'olympus-cx23': { id: 'olympus-cx23', name: 'Certified Pre-Owned Olympus CX23', price: 1150, category: 'Compound', icon: '🔬' }
  };

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not save cart', e);
    }
    updateCartUI();
  }

  function addToCart(product) {
    if (!product || !product.id) return;
    const cart = getCart();
    const existing = cart.find(function (item) { return item.id === product.id; });
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        icon: product.icon || '🔬',
        qty: 1
      });
    }
    saveCart(cart);
    openCart();
    showToast(product.name + ' added to cart');
  }

  function removeFromCart(id) {
    saveCart(getCart().filter(function (item) { return item.id !== id; }));
  }

  function updateQty(id, delta) {
    const cart = getCart();
    const item = cart.find(function (i) { return i.id === id; });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      removeFromCart(id);
    } else {
      saveCart(cart);
    }
  }

  function getCartCount() {
    return getCart().reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function getCartTotal() {
    return getCart().reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
  }

  function formatPrice(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function updateCartUI() {
    const count = getCartCount();
    const badges = document.querySelectorAll('.cart-badge');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = String(count);
      badges[i].style.display = count > 0 ? 'flex' : 'none';
    }

    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const emptyEl = document.getElementById('cartEmpty');
    const footerEl = document.getElementById('cartFooter');

    if (!container) return;

    const cart = getCart();

    if (cart.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';

    container.innerHTML = cart.map(function (item) {
      return (
        '<div class="cart-item" data-id="' + item.id + '">' +
          '<div class="cart-item-icon">' + (item.icon || '🔬') + '</div>' +
          '<div class="cart-item-info">' +
            '<div class="cart-item-name">' + item.name + '</div>' +
            '<div class="cart-item-meta">' + item.category + ' · ' + formatPrice(item.price) + '</div>' +
            '<div class="cart-item-qty">' +
              '<button type="button" class="qty-btn" data-action="dec" data-id="' + item.id + '" aria-label="Decrease">−</button>' +
              '<span>' + item.qty + '</span>' +
              '<button type="button" class="qty-btn" data-action="inc" data-id="' + item.id + '" aria-label="Increase">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-item-right">' +
            '<div class="cart-item-price">' + formatPrice(item.price * item.qty) + '</div>' +
            '<button type="button" class="cart-remove" data-action="remove" data-id="' + item.id + '" aria-label="Remove">×</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
  }

  function openCart() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    updateCartUI();
  }

  function closeCart() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showToast(message) {
    var toast = document.getElementById('cartToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cartToast';
      toast.className = 'cart-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 2200);
  }

  function setCheckoutLoading(loading) {
    var btns = document.querySelectorAll('[data-checkout]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = !!loading;
      btns[i].textContent = loading ? 'Connecting to Clover…' : 'Proceed to Checkout →';
    }
  }

  function checkout() {
    const cart = getCart();
    if (cart.length === 0) {
      showToast('Your cart is empty');
      return;
    }

    setCheckoutLoading(true);

    fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(function (item) {
          return {
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            category: item.category
          };
        })
      })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        setCheckoutLoading(false);
        if (!result.ok || !result.data.href) {
          var msg = (result.data && result.data.error) || 'Checkout failed';
          console.error('Checkout error', result);
          showToast(msg);
          fallbackContactCheckout(cart);
          return;
        }
        window.location.href = result.data.href;
      })
      .catch(function (err) {
        setCheckoutLoading(false);
        console.error('Checkout network error', err);
        showToast('Payment server unavailable — opening contact form');
        fallbackContactCheckout(cart);
      });
  }

  function fallbackContactCheckout(cart) {
    const summary = cart.map(function (i) {
      return i.qty + '× ' + i.name + ' (' + formatPrice(i.price * i.qty) + ')';
    }).join('\n');

    try {
      sessionStorage.setItem('vividscope_order', JSON.stringify({
        items: cart,
        total: getCartTotal(),
        summary: summary
      }));
    } catch (e) {}

    closeCart();
    window.location.href = 'contact.html?checkout=1';
  }

  function handleAddToCart(id) {
    const product = PRODUCTS[id];
    if (product) {
      addToCart(product);
    } else {
      console.warn('Unknown product id:', id);
    }
  }

  // Expose globally for inline handlers (backup)
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.handleAddToCart = handleAddToCart;
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateQty = updateQty;
  window.checkout = checkout;
  window.getCart = getCart;
  window.updateCartUI = updateCartUI;
  window.PRODUCTS = PRODUCTS;

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    updateCartUI();

    // Event delegation for Add to Cart buttons (works even if onclick fails)
    document.addEventListener('click', function (e) {
      var target = e.target;

      // Walk up in case click is on child text node wrapper
      var el = target.closest ? target.closest('[data-add-to-cart], [onclick*="handleAddToCart"], .cart-btn, [data-action], .cart-close, #cartOverlay') : null;

      // data-add-to-cart attribute
      var addBtn = target.closest ? target.closest('[data-add-to-cart]') : null;
      if (addBtn) {
        e.preventDefault();
        handleAddToCart(addBtn.getAttribute('data-add-to-cart'));
        return;
      }

      // Cart open button
      if (target.closest && target.closest('.cart-btn')) {
        e.preventDefault();
        openCart();
        return;
      }

      // Close cart
      if (target.id === 'cartOverlay' || (target.closest && target.closest('.cart-close'))) {
        e.preventDefault();
        closeCart();
        return;
      }

      // Qty / remove inside cart
      var actionBtn = target.closest ? target.closest('[data-action]') : null;
      if (actionBtn) {
        e.preventDefault();
        var action = actionBtn.getAttribute('data-action');
        var id = actionBtn.getAttribute('data-id');
        if (action === 'inc') updateQty(id, 1);
        else if (action === 'dec') updateQty(id, -1);
        else if (action === 'remove') removeFromCart(id);
        return;
      }

      // Checkout button
      if (target.closest && target.closest('[data-checkout]')) {
        e.preventDefault();
        checkout();
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });
  });
})();
