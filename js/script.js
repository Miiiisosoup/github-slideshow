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
                        <p>Price: ₹${item.price.toFixed(2)}</p>
                        <p>Quantity: ${item.quantity}</p>
                        <p>Total: ₹${itemTotal.toFixed(2)}</p>
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
            cartSubtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
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
            li.textContent = `${item.name} (x${item.quantity}) - ₹${(item.price * item.quantity).toFixed(2)}`;
            ul.appendChild(li);
            subtotal += item.price * item.quantity;
        });
        checkoutOrderSummaryContainer.appendChild(ul);

        const totalP = document.createElement('p');
        totalP.innerHTML = `<strong>Total: ₹${subtotal.toFixed(2)}</strong>`;
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
        checkoutForm.addEventListener('submit', async (event) => { // Made async
            event.preventDefault();

            const placeOrderBtn = document.getElementById('place-order-btn');
            const originalBtnText = placeOrderBtn.textContent;
            placeOrderBtn.disabled = true;
            placeOrderBtn.textContent = 'Processing...';

            const customerName = document.getElementById('name').value; // Assuming 'name' is the ID for customer name
            const customerEmail = document.getElementById('email').value; // Assuming 'email' is the ID for customer email

            if (!customerName || !customerEmail) {
                alert("Please fill in your Name and Email.");
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = originalBtnText;
                return;
            }

            if (cart.length === 0) {
                alert("Your cart is empty. Please add items before placing an order.");
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = originalBtnText;
                return;
            }

            // Calculate totalAmount from cart (in Rupees)
            const totalAmountForBackend = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Prepare items for notes
            const cartItemsForNotes = cart.map(item => ({
                productId: item.id, // Assuming 'id' is used in your cart item structure
                name: item.name,
                quantity: item.quantity,
                price: item.price // Price per unit
            }));

            const requestBody = {
                totalAmount: totalAmountForBackend, // in Rupees
                notes: {
                    customer_name: customerName,
                    customer_email: customerEmail,
                    items: JSON.stringify(cartItemsForNotes) // Stringify the items array for notes
                }
            };

            try {
                // Call Backend to Create Razorpay Order
                const orderResponse = await fetch('/api/orders/razorpay-create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody) // Use the new requestBody
                });

                if (!orderResponse.ok) {
                    const errorData = await orderResponse.json();
                    alert(`Error creating Razorpay order: ${errorData.msg || orderResponse.statusText}. Please try again.`);
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.textContent = originalBtnText;
                    return;
                }
                const orderData = await orderResponse.json(); // Contains { orderId, amount, currency }

                // Initialize Razorpay Checkout
                const options = {
                    key: "rzp_test_YOUR_KEY_ID", // Replace with your actual TEST Key ID (placeholder)
                    amount: orderData.amount, // Amount from backend (in paise)
                    currency: orderData.currency, // Should be "INR"
                    name: "Nexroy Services",
                    description: "Order Payment",
                    image: "https://via.placeholder.com/150x150.png/38B2AC/FFFFFF?text=N", // Placeholder logo
                    order_id: orderData.orderId, // From your backend
                    handler: function (response) {
                        // Payment successful on front-end
                        alert('Payment successful! Your order is being processed.\nPayment ID: ' + response.razorpay_payment_id + '\nOrder ID: ' + response.razorpay_order_id + '\nYou will receive a confirmation shortly.');
                        
                        cart.length = 0; 
                        localStorage.removeItem('nexroyCart');
                        updateCartIndicator();
                        
                        checkoutForm.reset();
                        if (checkoutOrderSummaryContainer) checkoutOrderSummaryContainer.innerHTML = '<p>Your order has been placed and payment was successful. Thank you! You will receive a confirmation email shortly.</p>';
                        if (document.getElementById('cart-subtotal')) document.getElementById('cart-subtotal').textContent = '₹0.00';
                        
                        // Optional: Redirect to a simple confirmation page
                        // For this task, I will create a very basic order-confirmation.html
                        window.location.href = 'order-confirmation.html'; 
                    },
                    prefill: {
                        name: customerName,
                        email: customerEmail,
                    },
                    notes: {
                        // address: "Customer Address Details" // You can add more notes if needed
                    },
                    theme: {
                        color: "#38B2AC" // Using primary green theme color
                    }
                };
                const rzp1 = new Razorpay(options);
                rzp1.on('payment.failed', function (response) {
                    alert('Payment failed! Error code: ' + response.error.code + '\nDescription: ' + response.error.description);
                    // Re-enable button on payment failure
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.textContent = originalBtnText;
                });
                
                rzp1.open(); // Open the Razorpay payment dialog
                // Button re-enabled in .finally or if rzp1.open() doesn't block, but for Razorpay it usually does.
                // It's safer to re-enable in payment.failed handler and after successful handler processing.
                // For simplicity here, if rzp.open() is called, we assume user interaction follows.
                // If user closes modal without paying, button remains disabled. A more robust solution would handle modal close.
                // However, the current task primarily focuses on initiating payment.

            } catch (error) {
                console.error('Error during checkout process:', error);
                alert('An error occurred during the checkout process. Please try again.');
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = originalBtnText;
            }
            // Not re-enabling button here as Razorpay modal takes over.
            // Re-enable in handler or payment.failed.
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

    // --- Shop Page Product Filtering ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productItems = document.querySelectorAll('.product-item');

    if (filterButtons.length > 0 && productItems.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to the clicked button
                button.classList.add('active');

                const filterValue = button.dataset.filter;

                productItems.forEach(item => {
                    if (filterValue === 'all' || item.dataset.category === filterValue) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                });
            });
        });
    }

    // --- Hamburger Menu Toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const navLinksUl = document.querySelector('.main-nav .nav-links'); // Targets the UL

    if (navToggle && navLinksUl) {
        navToggle.addEventListener('click', () => {
            navLinksUl.classList.toggle('active');
            navToggle.classList.toggle('active'); 
        });
    }

    // --- Services Dropdown Toggle (for Desktop and Mobile) ---
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (event) => {
            // Allow default behavior (navigation) if it's a link with a real href for non-JS fallback or mobile main link
            // For this setup, the main "Services" link has href="#"
            if (toggle.getAttribute('href') === '#' || toggle.closest('.nav-links.active')) { // Second condition for when it's inside active mobile menu
                 event.preventDefault(); 
            }

            const dropdown = toggle.parentElement; // The .dropdown li
            dropdown.classList.toggle('open');

            // Aria-expanded attribute update
            const isExpanded = dropdown.classList.contains('open');
            toggle.setAttribute('aria-expanded', isExpanded);
        });
    });

    // Optional: Close dropdown when clicking outside (for desktop)
    document.addEventListener('click', (event) => {
        const openDropdown = document.querySelector('.dropdown.open');
        if (openDropdown && !openDropdown.contains(event.target)) {
            openDropdown.classList.remove('open');
            const toggle = openDropdown.querySelector('.dropdown-toggle');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        }
    });


    // --- Contact Page Form Functionality ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (event) => { // Made async
            event.preventDefault();
            
            // Add a reference to the submit button to disable it during submission
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            const contactName = document.getElementById('contact-name').value;
            const contactEmail = document.getElementById('contact-email').value;
            const contactSubject = document.getElementById('contact-subject').value;
            const contactMessage = document.getElementById('contact-message').value;

            // Client-side validation (kept existing, can be enhanced)
            if (!contactName || !contactEmail || !contactMessage) { // Subject can be optional
                alert("Please fill in all required fields (Name, Email, Message).");
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                return;
            }

            const formData = {
                name: contactName,
                email: contactEmail,
                subject: contactSubject,
                message: contactMessage
            };

            try {
                const response = await fetch('http://localhost:3001/api/contact/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const responseData = await response.json();

                if (response.ok) {
                    alert(responseData.msg || 'Message sent successfully!');
                    contactForm.reset();
                } else {
                    let errorMessage = responseData.msg || `An error occurred: ${response.statusText}`;
                    if (responseData.errors) { 
                        errorMessage += '\n' + responseData.errors.join('\n');
                    }
                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('An error occurred while sending the message. Please try again later.');
            } finally {
                // Re-enable the button and restore its text
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // --- Chatbot UI Toggle Functionality ---
    const chatbotToggler = document.querySelector('.chatbot-toggler');
    const chatbotWindow = document.querySelector('.chatbot-window');
    const closeChatBtn = document.querySelector('.close-chat-btn');

    if (chatbotToggler && chatbotWindow && closeChatBtn) {
        chatbotToggler.addEventListener('click', () => {
            chatbotWindow.classList.toggle('active');
        });

        closeChatBtn.addEventListener('click', () => {
            chatbotWindow.classList.remove('active');
        });
    }

    // --- Services Carousel Navigation ---
    const carouselViewport = document.querySelector('.carousel-viewport');
    const prevCarouselBtn = document.querySelector('.carousel-btn.prev-btn');
    const nextCarouselBtn = document.querySelector('.carousel-btn.next-btn');

    if (carouselViewport && prevCarouselBtn && nextCarouselBtn) {
        const scrollAmount = () => {
            // Attempt to get the width of a single slide.
            // If slides have variable width or this is complex, use viewport width.
            const firstSlide = carouselViewport.querySelector('.carousel-slide');
            if (firstSlide) {
                // Consider slide width + gap for a more accurate scroll per item
                const slideStyle = window.getComputedStyle(firstSlide);
                const slideMarginRight = parseFloat(slideStyle.marginRight); // If gap is from margin
                // If gap is from `gap` property on flex container, it's harder to get directly per slide here.
                // Let's use a simpler approach: scroll by a percentage of viewport or fixed amount.
                // For simplicity and given CSS snap, scrolling by viewport width is often effective.
                return carouselViewport.clientWidth * 0.8; // Scroll by 80% of viewport width
            }
            return carouselViewport.clientWidth * 0.8; // Default if no slide found (fallback)
        };

        nextCarouselBtn.addEventListener('click', () => {
            carouselViewport.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
        });

        prevCarouselBtn.addEventListener('click', () => {
            carouselViewport.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
        });
    }

});

// Helper function to get current cart (if needed outside DOMContentLoaded)
function getCurrentCart() {
    return JSON.parse(localStorage.getItem('nexroyCart')) || [];
}
