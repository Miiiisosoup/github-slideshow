// Main JavaScript file for Nexroy

document.addEventListener('DOMContentLoaded', () => {
    // 1. Modify Cart Initialization from localStorage
    let rawCart = [];
    try {
        rawCart = JSON.parse(localStorage.getItem('nexroyCart')) || [];
    } catch (error) {
        console.error("Error parsing nexroyCart from localStorage:", error);
        // rawCart remains [], so cart will be empty, which is a safe default
    }

    const cleanedCart = rawCart.filter(item => {
        const quantity = item && typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
        return quantity > 0;
    }).map(item => { // Ensure quantity is an integer after filtering, though filter already checks for number.
        item.quantity = Math.floor(item.quantity); // Or Math.round() if preferred
        return item;
    });

    // The global 'cart' variable used throughout the script is this cleanedCart.
    // Since 'cart' was originally a const, and its reference is passed around,
    // we need to make sure functions modify this 'cleanedCart' or that 'cart' itself is mutable
    // and correctly reassigned if functions expect to reassign the global cart.
    // For this script's structure, where `cart` is a const initialized at the top
    // and then mutated by .push, .splice, .length=0, we'll assign cleanedCart to a new
    // mutable variable (let) that has the same name 'cart' for minimal changes to the rest of the script.
    // However, the original `cart` was a const. Modifying this to `let` for the entire scope.
    // To preserve the const nature for functions not expecting to reassign `cart` itself,
    // but rather mutate its contents, we can initialize `cart` with `cleanedCart`'s contents.
    // The simplest way is to make `cart` a `let` variable.
    let cart = cleanedCart;
    // If cart items were re-validated and some removed, update localStorage.
    if (rawCart.length !== cart.length) {
        localStorage.setItem('nexroyCart', JSON.stringify(cart));
    }


    // --- General UI Elements ---
    const cartCountIndicator = document.getElementById('cart-count');

    function updateCartIndicator() {
        if (cartCountIndicator) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            // 2. Defensive Coding in updateCartIndicator
            const displayTotal = Math.max(0, totalItems);
            cartCountIndicator.textContent = displayTotal;
            cartCountIndicator.style.display = displayTotal > 0 ? 'inline' : 'none'; // Show if items > 0
        }
    }


    // --- Shop Page Functionality ---
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const productId = event.target.dataset.id;
            const productName = event.target.dataset.name;
            const productPrice = parseFloat(event.target.dataset.price);
            const quantityInput = event.target.previousElementSibling; // Assuming quantity input is right before the button
            let quantity = 1;
            if (quantityInput && quantityInput.type === 'number') {
                quantity = parseInt(quantityInput.value) || 1;
            }


            const existingItemIndex = cart.findIndex(item => item.id === productId);

            if (existingItemIndex > -1) {
                cart[existingItemIndex].quantity += quantity;
            } else {
                cart.push({ id: productId, name: productName, price: productPrice, quantity: quantity });
            }

            localStorage.setItem('nexroyCart', JSON.stringify(cart));
            alert(`${productName} (x${quantity}) added to cart!`);
            updateCartIndicator();
            // console.log("Cart updated:", cart);
        });
    });

    // --- Cart Page Functionality ---
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSubtotalElement = document.getElementById('cart-subtotal');
    const clearCartButton = document.getElementById('clear-cart-btn');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const checkoutButton = document.getElementById('checkout-btn');


    function renderCart() {
        if (!cartItemsContainer) return; // Only run on cart page

        cartItemsContainer.innerHTML = ''; // Clear existing items
        let subtotal = 0;

        if (cart.length === 0) {
            if (emptyCartMessage) emptyCartMessage.style.display = 'block';
            if (checkoutButton) checkoutButton.style.display = 'none'; // Hide checkout if cart empty
        } else {
            if (emptyCartMessage) emptyCartMessage.style.display = 'none';
            if (checkoutButton) checkoutButton.style.display = 'block';


            cart.forEach((item, index) => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;

                const cartItemDiv = document.createElement('div');
                cartItemDiv.classList.add('cart-item');
                cartItemDiv.innerHTML = `
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>Price: $${item.price.toFixed(2)}</p>
                        <p>Quantity: ${item.quantity}</p>
                        <p>Total: $${itemTotal.toFixed(2)}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="remove-item-btn" data-index="${index}">Remove</button>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItemDiv);
            });

            // Add event listeners for remove buttons
            document.querySelectorAll('.remove-item-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const itemIndex = parseInt(event.target.dataset.index);
                    removeItemFromCart(itemIndex);
                });
            });
        }

        if (cartSubtotalElement) {
            cartSubtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        }
        updateCartIndicator(); // Also update indicator when cart changes
    }

    function removeItemFromCart(index) {
        if (index > -1 && index < cart.length) {
            cart.splice(index, 1);
            localStorage.setItem('nexroyCart', JSON.stringify(cart));
            renderCart(); // Re-render the cart
        }
    }

    if (clearCartButton) {
        clearCartButton.addEventListener('click', () => {
            cart.length = 0; // Clear the array
            localStorage.removeItem('nexroyCart');
            renderCart();
            alert("Cart cleared!");
        });
    }

    // --- Checkout Page Functionality ---
    const checkoutForm = document.getElementById('checkout-form');
    const sameAsShippingCheckbox = document.getElementById('same-as-shipping');
    const billingFields = [
        document.getElementById('billing-address'),
        document.getElementById('billing-city'),
        document.getElementById('billing-zip'),
        document.getElementById('billing-country')
    ];
    const shippingFields = [
        document.getElementById('shipping-address'),
        document.getElementById('shipping-city'),
        document.getElementById('shipping-zip'),
        document.getElementById('shipping-country')
    ];
    const checkoutOrderSummaryContainer = document.getElementById('checkout-order-summary');


    function populateCheckoutSummary() {
        if (!checkoutOrderSummaryContainer) return;

        checkoutOrderSummaryContainer.innerHTML = ''; // Clear
        let subtotal = 0;

        if (cart.length === 0) {
            checkoutOrderSummaryContainer.innerHTML = '<p>Your cart is empty. Please add items from the shop.</p>';
            return;
        }

        const ul = document.createElement('ul');
        cart.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`;
            ul.appendChild(li);
            subtotal += item.price * item.quantity;
        });
        checkoutOrderSummaryContainer.appendChild(ul);

        const totalP = document.createElement('p');
        totalP.innerHTML = `<strong>Total: $${subtotal.toFixed(2)}</strong>`;
        checkoutOrderSummaryContainer.appendChild(totalP);
    }


    if (sameAsShippingCheckbox) {
        sameAsShippingCheckbox.addEventListener('change', () => {
            billingFields.forEach(field => {
                if (field) field.disabled = sameAsShippingCheckbox.checked;
                if (sameAsShippingCheckbox.checked && field && shippingFields[billingFields.indexOf(field)]) {
                     // Copy value if checked, ensure corresponding shipping field exists
                    field.value = shippingFields[billingFields.indexOf(field)].value;
                } else if (field) {
                    field.value = ''; // Clear if unchecked
                }
            });
        });
    }
    
    // Initial sync for billing address if checkbox is checked on page load
    if (sameAsShippingCheckbox && sameAsShippingCheckbox.checked) {
        billingFields.forEach(field => {
            if (field) field.disabled = true;
             if (field && shippingFields[billingFields.indexOf(field)]) {
                field.value = shippingFields[billingFields.indexOf(field)].value;
            }
        });
    }


    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // Basic validation example
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            if (!name || !email) {
                alert("Please fill in your Name and Email.");
                return;
            }
            if(cart.length === 0){
                alert("Your cart is empty. Please add items before placing an order.");
                return;
            }

            alert("Order Placed (Simulated)! Thank you for your purchase. We will be in touch shortly via email.");
            
            // Clear cart after "successful" simulated order
            cart.length = 0;
            localStorage.removeItem('nexroyCart');
            updateCartIndicator();
            
            // Optionally redirect or clear form
            checkoutForm.reset();
            if (checkoutOrderSummaryContainer) checkoutOrderSummaryContainer.innerHTML = '<p>Your order has been placed. Cart is now empty.</p>';
            if (document.getElementById('cart-subtotal')) document.getElementById('cart-subtotal').textContent = '$0.00'; // if on same page
            // window.location.href = 'thank-you.html'; // If you have a thank you page
        });
    }


    // Initial calls on page load
    updateCartIndicator(); // For all pages with indicator
    if (window.location.pathname.endsWith('cart.html')) {
        renderCart();
    }
    if (window.location.pathname.endsWith('checkout.html')) {
        populateCheckoutSummary();
    }

    // --- Hamburger Menu Toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.main-nav .nav-links'); // More specific selector

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active'); // For styling the hamburger icon itself (e.g., to X)
        });
    }

    // --- Contact Page Form Functionality ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const contactName = document.getElementById('contact-name').value;
            const contactEmail = document.getElementById('contact-email').value;
            const contactSubject = document.getElementById('contact-subject').value;
            const contactMessage = document.getElementById('contact-message').value;

            if (!contactName || !contactEmail || !contactSubject || !contactMessage) {
                alert("Please fill in all fields of the contact form.");
                return;
            }

            // Simulate sending message
            alert("Thank you for your message! We'll get back to you soon.");
            contactForm.reset(); // Clear the form
        });
    }
});

// Helper function to get current cart (if needed outside DOMContentLoaded)
function getCurrentCart() {
    return JSON.parse(localStorage.getItem('nexroyCart')) || [];
}
