import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus } from 'lucide-react';

const ShoppingCart = () => {
  const [cartItems, setCartItems] = React.useState([
    {
      id: 1,
      name: "Storin 15.6 Inch Reversible Laptop Sleeve Cover Case For Hp,Lenovo,Dell,Asus,Acer,Sony,Apple Macbook,Assorted",
      price: 1800.00,
      quantity: 1,
      inStock: true,
      seller: "Storin Electro World",
      amazonDelivered: true,
      image: "https://m.media-amazon.com/images/I/31xVkJckbUL._SX300_SY300_QL70_FMwebp_.jpg"
    },
    {
      id: 2,
      name: "Caresmith Charge Boost Massage Gun | Body Massager | Massager Machine for Pain Relief",
      price: 1497.00,
      quantity: 1,
      inStock: true,
      seller: "Caresmith",
      originalPrice: 5000.00,
      discount: 70,
      limitedDeal: true,
      image: "https://m.media-amazon.com/images/I/41hpHbg6SfL._SX300_SY300_QL70_FMwebp_.jpg"
    }
  ]);

  const handleQuantityChange = (id, change) => {
    setCartItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    );
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <div className="container my-4">
      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <h1 className="h4 mb-0">Shopping Cart</h1>
                <Link to="/" className="text-decoration-none text-primary">Deselect all items</Link>
              </div>
            </div>
            <div className="card-body">
              {cartItems.map(item => (
                <div key={item.id} className="mb-4 pb-4 border-bottom">
                  <div className="row">
                    <div className="col-md-2">
                      <img src={item.image} alt={item.name} className="img-fluid" />
                    </div>
                    <div className="col-md-10">
                      <div className="d-flex justify-content-between">
                        <Link to={`/product/${item.id}`} className="text-decoration-none text-dark">
                          <h5 className="mb-2">{item.name}</h5>
                        </Link>
                        <h5 className="mb-0">₹{item.price.toFixed(2)}</h5>
                      </div>
                      
                      {item.inStock && (
                        <div className="text-success small mb-2">In stock</div>
                      )}
                      
                      <div className="small text-muted mb-2">
                        Sold by {item.seller}
                      </div>
                      
                      {item.amazonDelivered && (
                        <div className="small mb-1">
                          <img src="/https://m.media-amazon.com/images/G/31/easyship-SVDRVS/amazon-delivered-DSVVSR._CB485933315_.png" alt="Amazon Delivered" className="me-1" />
                          Amazon Delivered
                        </div>
                      )}
                      
                      {item.limitedDeal && (
                        <div className="mb-2">
                          <span className="badge bg-danger me-2">Limited time deal</span>
                          <span className="text-danger">-{item.discount}%</span>
                          <span className="text-muted text-decoration-line-through ms-2">
                            M.R.P.: ₹{item.originalPrice.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="d-flex align-items-center mt-3">
                        <div className="border rounded me-3">
                          <button 
                            className="btn btn-light btn-sm"
                            onClick={() => handleQuantityChange(item.id, -1)}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="px-3">{item.quantity}</span>
                          <button 
                            className="btn btn-light btn-sm"
                            onClick={() => handleQuantityChange(item.id, 1)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <button className="btn btn-link text-danger text-decoration-none me-3">
                          <Trash2 size={16} className="me-1" />
                          Delete
                        </button>
                        
                        <button className="btn btn-link text-decoration-none">
                          Share
                        </button>
                        <button className="btn btn-warning buyButton">
                Proceed to Buy
              </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <div className="text-success mb-3">
                <div className="d-flex align-items-center">
                  <span className="me-2">✓</span>
                  Part of your order qualifies for FREE Delivery.
                </div>
                Choose FREE Delivery option at checkout.
              </div>
              
              <h5>Subtotal ({cartItems.length} items): ₹{calculateSubtotal().toFixed(2)}</h5>
              
              <div className="form-check mb-3">
                <input type="checkbox" className="form-check-input" id="giftOrder" />
                <label className="form-check-label" htmlFor="giftOrder">
                  This order contains a gift
                </label>
              </div>
              
              <button className="btn btn-warning w-100">
                Proceed to Buy
              </button>
              
              <div className="mt-3">
                <button className="btn btn-link w-100 text-decoration-none">
                  EMI Available ▼
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;