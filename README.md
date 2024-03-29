# Real Estate Aggregator

**Propertea.in** is a secure platform designed to enable property transactions and document verification in the real estate industry. The focus of this project is to create a portal that facilitates the secure exchange and verification of property-related documents and enables secure transactions during property buying, selling, and renting.

## Description
### :busts_in_silhouette: Users
* **Property Owners (Sellers and Lessors) -** Property owners can list, delete, and modify their property listings. They upload property-related documents (e.g., ownership proofs, identification documents), which are automatically verified by the portal for authenticity. They can view their past sell or rent out history and report any suspicious activity to the admin.

* **Property Seekers (Buyers and Lessees) -** Property seekers can search and select properties based on various criteria such as type, budget, location, amenities, and availability dates. They upload their proof of identity documents, which are automatically verified by the portal. Property seekers can view their past purchase history and report any malicious listings to the admin.

* **Admins -** Admins have access to all user details and can moderate any suspicious activity or listings on the platform. They can remove suspicious sellers or buyers and have the authority to approve contracts. Admins ensure the authenticity and integrity of the transactions on the platform.

### :sparkles: Features
* Listing, searching, and selection of properties for buying or renting
* Escrow-based payment system for property purchases, including installment options
* Maintenance of user profiles and property listings
* Creation of digital contracts, electronically signed by involved parties, ensuring secure transactions
* eKYC integration for user registration and transaction authentication
* Automatic verification of uploaded documents for authenticity
* Suspicious activity reporting mechanism for users and admin intervention
* Secure transaction logging for external audits
* Implementation of security features to defend against potential attacks
* OTP validation for sensitive transactions, ensuring enhanced security

### :lock: Security
* Utilization of public key infrastructure (PKI) and SSL/TLS (HTTPS) to enforce application security
* Implementation of OTP (One Time Password) technique with virtual keyboard feature for sensitive transactions
* Secure session management
* User authentication mechanisms
* IP-address based rate limiting to mitigate potential attacks
* Input validation and sanitization to prevent injection attacks
* Storage of sensitive data following payment gateway compliance standards
* Strong password enforcement, hashing, and salting of passwords before storage
* Secure communication protocols for data transmission between server and client

## Technologies Used
* FastAPI
* Angular
* MongoDB

## Authors
This project was developed by
* [Diksha Sethi](https://github.com/dikshasethi2511)
* [Srishti Jain]
* [Mudit Gupta]
* [Kush Aggarwal]
