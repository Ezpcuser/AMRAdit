// Initialize Supabase (replace with your config)
const supabaseUrl = 'https://ocmgpkdfafhjwbvwtufz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jbWdwa2RmYWZoandidnd0dWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMDU2NjIsImV4cCI6MjA1ODU4MTY2Mn0.RYObUACzEFmSn4YnagdOEj_P1mv-CeU_qsDg3Kc9Ae0';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const viewMenuBtn = document.getElementById('viewMenuBtn');
const manageMenuBtn = document.getElementById('manageMenuBtn');
const menuView = document.getElementById('menuView');
const manageView = document.getElementById('manageView');
const menuCategories = document.getElementById('menuCategories');
const addCategoryForm = document.getElementById('addCategoryForm');
const addItemForm = document.getElementById('addItemForm');
const itemCategory = document.getElementById('itemCategory');
const currentMenu = document.getElementById('currentMenu');

// Switch between views
viewMenuBtn.addEventListener('click', () => {
    menuView.style.display = 'block';
    manageView.style.display = 'none';
    loadMenu();
});

manageMenuBtn.addEventListener('click', () => {
    menuView.style.display = 'none';
    manageView.style.display = 'block';
    loadCategoriesForDropdown();
    loadFullMenuForManagement();
});

// Add new category
addCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoryName = document.getElementById('categoryName').value;
    
    const { data, error } = await supabase
        .from('categories')
        .insert([{ name: categoryName }])
        .select();
    
    if (error) {
        console.error('Error adding category:', error);
        alert('Error adding category: ' + error.message);
    } else {
        alert('Category added successfully!');
        addCategoryForm.reset();
        loadCategoriesForDropdown();
        loadFullMenuForManagement();
    }
});

// Add new menu item
addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const categoryId = itemCategory.value;
    const name = document.getElementById('itemName').value;
    const description = document.getElementById('itemDescription').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const imageFile = document.getElementById('itemImage').files[0];
    
    let imageUrl = "https://ocmgpkdfafhjwbvwtufz.supabase.co/storage/v1/object/public/comidas//ProtoLogo.png";

    if (imageFile) {
        // Upload image to Supabase Storage
        const fileName = `${Date.now()}_${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('menu-items')
            .upload(fileName, imageFile);
        
        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            alert('Error uploading image: ' + uploadError.message);
            return;
        }
        // Get public URL
        const { data: urlData } = supabase
            .storage
            .from('menu-items')
            .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
    }

// Insert menu item
    const { data, error } = await supabase
        .from('menu_items')
        .insert([{
            category_id: categoryId,
            name: name,
            description: description,
            price: price,
            image_url: imageUrl
        }])
        .select();
    
    if (error) {
        console.error('Error adding item:', error);
        alert('Error adding item: ' + error.message);
    } else {
        alert('Item added successfully!');
        addItemForm.reset();
        loadFullMenuForManagement();
    }
});

// Load categories for dropdown
async function loadCategoriesForDropdown() {
    itemCategory.innerHTML = '<option value="">Select a category</option>';
    
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
    
    if (!error) {
        data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            itemCategory.appendChild(option);
        });
    } else {
        console.error('Error loading categories:', error);
    }
}


// Load full menu for management view
async function loadFullMenuForManagement() {
    currentMenu.innerHTML = '<h3>Current Menu</h3>';
    
    const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
    
    if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
        currentMenu.innerHTML += '<p>Error loading categories</p>';
        return;
    }
    
    for (const category of categories) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'menu-category';
        categoryDiv.innerHTML = `<h4>${category.name}</h4>`;
        currentMenu.appendChild(categoryDiv);
        
        const itemsList = document.createElement('div');
        categoryDiv.appendChild(itemsList);
        
        const { data: items, error: itemsError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('category_id', category.id)
            .order('name', { ascending: true });
        
        if (itemsError) {
            console.error('Error loading items:', itemsError);
            itemsList.innerHTML = '<p>Error loading items</p>';
        } else if (items.length === 0) {
            itemsList.innerHTML = '<p>No items in this category yet.</p>';
        } else {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'menu-item';
                itemDiv.innerHTML = `
                    ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}">` : ''}
                    <div class="item-info">
                        <h5>${item.name}</h5>
                        <p>${item.description || ''}</p>
                        <p class="item-price">$${item.price.toFixed(2)}</p>
                    </div>
                    <button class="delete-item" data-id="${item.id}">Delete</button>
                `;
                itemsList.appendChild(itemDiv);
            });

        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-item').forEach(button => {
                button.addEventListener('click', async (e) => {
                    if (confirm('Are you sure you want to delete this item?')) {
                        const { error } = await supabase
                            .from('menu_items')
                            .delete()
                            .eq('id', e.target.dataset.id);
                        
                        if (error) {
                            console.error('Error deleting item:', error);
                        } else {
                            loadFullMenuForManagement();
                        }
                    }
                });
            });
        }
    }
}


// Load menu for public view
async function loadMenu() {
    menuCategories.innerHTML = '';
    
    const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
    
    if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
        menuCategories.innerHTML = '<p>Error loading menu</p>';
        return;
    }
    
    for (const category of categories) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'menu-category';
        categoryDiv.innerHTML = `<h3>${category.name}</h3>`;
        menuCategories.appendChild(categoryDiv);
        
        const itemsList = document.createElement('div');
        categoryDiv.appendChild(itemsList);
        
        const { data: items, error: itemsError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('category_id', category.id)
            .order('name', { ascending: true });
        
        if (itemsError) {
            console.error('Error loading items:', itemsError);
            itemsList.innerHTML = '<p>Error loading items</p>';
        } else if (items.length === 0) {
            itemsList.innerHTML = '<p>Coming soon!</p>';
        } else {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'menu-item';
                itemDiv.innerHTML = `
                    ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}">` : ''}
                    <div class="item-info">
                        <h4>${item.name}</h4>
                        <p>${item.description || ''}</p>
                        <p class="item-price">$${item.price.toFixed(2)}</p>
                    </div>
                `;
                itemsList.appendChild(itemDiv);
            });
        }
    }
}
// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadCategoriesForDropdown();
    loadMenu();
});