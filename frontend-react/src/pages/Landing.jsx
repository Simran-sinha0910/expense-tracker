import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  useEffect(() => {
    const el = document.getElementById('heroCarousel')
    // Initialize Bootstrap carousel explicitly to ensure auto-cycling
    const bs = window.bootstrap
    if (el && bs && bs.Carousel) {
      // eslint-disable-next-line no-new
      new bs.Carousel(el, { interval: 4000, ride: 'carousel', pause: 'hover', wrap: true, touch: true })
    }
  }, [])
  return (
    <div className="landing">
      {/* Header & Navigation (non-sticky to match app preference) */}
      <header className="bg-white shadow-sm">
        <nav className="navbar navbar-expand-lg navbar-light container-fluid px-4 py-3">
          <a className="navbar-brand fw-bold fs-4 d-flex align-items-center" href="#">
            <i className="fas fa-money-bill-wave me-2" style={{color: '#10b981'}}></i>
            <span className="text-gradient">Syntax Squad</span>
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
              <li className="nav-item"><a className="nav-link active" aria-current="page" href="#">Home</a></li>
              <li className="nav-item"><a className="nav-link" href="#about">About</a></li>
              <li className="nav-item"><a className="nav-link" href="#steps">How It Works</a></li>
              <li className="nav-item"><a className="nav-link" href="#contact">Contact</a></li>
            </ul>
            <div className="ms-lg-3 d-flex gap-2">
              <Link to="/login" className="btn btn-outline-primary">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section with carousel */}
      <main>
        <section className="hero-section text-center">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-8 col-md-10 col-12">
                <div className="hero-title-section mb-4">
                  <div className="floating-icons mb-3">
                    <i className="fas fa-coins text-gradient me-3 floating-icon" style={{fontSize:'2rem'}}></i>
                    <i className="fas fa-chart-line text-gradient me-3 floating-icon" style={{fontSize:'2rem'}}></i>
                    <i className="fas fa-wallet text-gradient floating-icon" style={{fontSize:'2rem'}}></i>
                  </div>
                  <h3 className="display-4 sem text-gradient fw-bold mb-3">LedgerPro</h3>
                  <div className="hero-subtitle">
                    <span className="badge bg-gradient text-white px-4 py-2 rounded-pill fs-6 mb-3">
                      <i className="fas fa-sparkles me-2"></i>Smart Financial Management
                    </span>
                  </div>
                </div>

                <div id="heroCarousel" className="carousel slide rounded-3xl mb-5" data-bs-ride="carousel" data-bs-interval="4000" data-bs-pause="hover">
                  <div className="carousel-indicators">
                    <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Slide 1"></button>
                    <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="1" aria-label="Slide 2"></button>
                    <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="2" aria-label="Slide 3"></button>
                  </div>
                  <div className="carousel-inner rounded-3xl" style={{height: 500}}>
                    <div className="carousel-item active" style={{height:'100%'}}>
                      <img
                        src="https://images.unsplash.com/photo-1567427013953-1e1ab3c79f24?auto=format&fit=crop&w=1600&q=80"
                        className="d-block w-100 hero-image"
                        alt="Budgeting and calculator"
                        style={{height:'100%', objectFit:'cover'}}
                        onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='https://picsum.photos/id/1005/1600/900' }}
                      />
                      <div className="carousel-caption d-none d-md-block">
                        <h5 className="fw-bold">Easy Expense Entry</h5>
                        <p>Log your transactions quickly and easily.</p>
                      </div>
                    </div>
                    <div className="carousel-item" style={{height:'100%'}}>
                      <img
                        src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80"
                        className="d-block w-100 hero-image"
                        alt="Interactive dashboard and planning"
                        style={{height:'100%', objectFit:'cover'}}
                        onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='https://picsum.photos/id/1011/1600/900' }}
                      />
                      <div className="carousel-caption d-none d-md-block">
                        <h5 className="fw-bold">Interactive Dashboard</h5>
                        <p>Visualize your spending habits with a dynamic dashboard.</p>
                      </div>
                    </div>
                    <div className="carousel-item" style={{height:'100%'}}>
                      <img
                        src="https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1600&q=80"
                        className="d-block w-100 hero-image"
                        alt="Detailed financial reports"
                        style={{height:'100%', objectFit:'cover'}}
                        onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='https://picsum.photos/id/1015/1600/900' }}
                      />
                      <div className="carousel-caption d-none d-md-block">
                        <h5 className="fw-bold">Detailed Reports</h5>
                        <p>Generate comprehensive reports for better financial management.</p>
                      </div>
                    </div>
                  </div>
                  <button className="carousel-control-prev" type="button" data-bs-target="#heroCarousel" data-bs-slide="prev">
                    <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span className="visually-hidden">Previous</span>
                  </button>
                  <button className="carousel-control-next" type="button" data-bs-target="#heroCarousel" data-bs-slide="next">
                    <span className="carousel-control-next-icon" aria-hidden="true"></span>
                    <span className="visually-hidden">Next</span>
                  </button>
                </div>

                <p className="lead text-muted mb-5">
                  Track and manage your expenses effortlessly. Our intuitive application helps you understand your spending habits and save money.
                </p>
                <Link to="/login" className="btn btn-primary btn-lg shadow-lg">Get Started</Link>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-5" style={{background: 'linear-gradient(135deg, #111827 0%, #374151 100%)', color:'#ffffff'}}>
          <div className="container my-5">
            <div className="row justify-content-center">
              <div className="col-lg-8 text-center">
                <h2 className="display-5 fw-bold mb-4" style={{color:'#ffffff'}}>Why Our LedgerPro?</h2>
                <p className="lead" style={{color:'#e5e7eb'}}>
                  This application is designed to give you a clear and simple way to manage your finances.
                  By tracking every expense, you gain valuable insights into where your money goes.
                  Our goal is to make financial management less of a chore and more of a habit.
                </p>
              </div>
            </div>
            <div className="row mt-5 g-4 text-center">
              <div className="col-md-4">
                <div className="card p-4 h-100">
                  <i className="fas fa-check-circle fa-2x text-success mb-3"></i>
                  <h5 className="fw-bold">Easy to Use</h5>
                  <p className="text-muted">A simple, clean interface that makes tracking expenses quick and painless.</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card p-4 h-100">
                  <i className="fas fa-tachometer-alt fa-2x text-info mb-3"></i>
                  <h5 className="fw-bold">Interactive Dashboard</h5>
                  <p className="text-muted">Visualize your spending with a dynamic dashboard for better insights.</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card p-4 h-100">
                  <i className="fas fa-chart-line fa-2x text-primary mb-3"></i>
                  <h5 className="fw-bold">Detailed Reports</h5>
                  <p className="text-muted">Generate comprehensive reports to analyze your financial health.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section id="steps" className="py-5" style={{background: 'linear-gradient(135deg, #111827 0%, #374151 100%)', color: 'white'}}>
          <div className="container my-5">
            <div className="row justify-content-center">
              <div className="col-lg-8 text-center">
                <h2 className="display-5 fw-bold mb-5">How It Works</h2>
              </div>
            </div>
            <div className="row justify-content-center g-4">
              <div className="col-md-6 col-lg-4">
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h5 className="fw-bold">Sign Up</h5>
                    <p className="text-muted mb-0">Create an account to get started on your financial journey.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-lg-4">
                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h5 className="fw-bold">Add Expenses</h5>
                    <p className="text-muted mb-0">Effortlessly log expenses with details like description, type, and amount.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-lg-4">
                <div className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h5 className="fw-bold">View Dashboard</h5>
                    <p className="text-muted mb-0">See an overview of your spending and gain valuable insights.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contact" className="bg-dark text-white py-5 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-6 mb-4 mb-md-0">
              <h5 className="fw-bold mb-3">Expense Tracker</h5>
              <p className="text-white text-decoration-none">Your ultimate tool for financial clarity.</p>
            </div>
            <div className="col-md-3 mb-4 mb-md-0">
              <h5 className="fw-bold mb-3">Links</h5>
              <ul className="list-unstyled text-muted">
                <li><a href="#" className="text-white text-decoration-none">Home</a></li>
                <li><a href="#about" className="text-white text-decoration-none">About Us</a></li>
                <li><a href="#steps" className="text-white text-decoration-none">How it works</a></li>
              </ul>
            </div>
            <div className="col-md-3">
              <h5 className="fw-bold mb-3">Contact Us</h5>
              <ul className="list-unstyled text-muted">
                <li>Email: <a href="mailto:simransinha@gmail.com" className="text-white text-decoration-none">simransinha@gmail.com</a></li>
                <li>Email: <a href="mailto:stanyrayan@gmail.com" className="text-white text-decoration-none">stanyrayan@gmail.com</a></li>
                <li>Email: <a href="mailto:shaikhasimsaheb@gmail.com" className="text-white text-decoration-none">shaikhasimsaheb@gmail.com</a></li>
              </ul>
            </div>
          </div>
          <hr className="mt-4" />
          <div className="text-center">
            <small>&copy; {new Date().getFullYear()} Expense Tracker. All Rights Reserved.</small>
          </div>
        </div>
      </footer>
    </div>
  )
}
