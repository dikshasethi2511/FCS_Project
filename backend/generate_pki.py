from all_imports import *

def generate_prime(bits):
    while True:
        prime_candidate = random.getrandbits(bits)
        if prime_candidate % 2 == 0:
            prime_candidate += 1
        if is_prime(prime_candidate):
            return prime_candidate


def is_prime(n, k=5):
    if n <= 1:
        return False
    if n <= 3:
        return True

    def is_composite(a, d, n, r):
        x = pow(a, d, n)
        if x == 1 or x == n - 1:
            return False
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                return False
        return True

    d, r = n - 1, 0
    while d % 2 == 0:
        d //= 2
        r += 1

    for _ in range(k):
        a = random.randint(2, n - 2)
        if is_composite(a, d, n, r):
            return False

    return True


def mod_inverse(e, phi):
    a, b = e, phi
    x0, x1 = 0, 1
    while a > 1:
        q = a // b
        a, b = b, a % b
        x0, x1 = x1 - q * x0, x0
    return x1 % phi


def encode(private_key_pem, message):
    key_structure = None
    match = re.search(
        r'-----BEGIN RSA PRIVATE KEY-----(.*?)-----END RSA PRIVATE KEY-----', private_key_pem, re.DOTALL)
    if match:
        key_structure = match.group(1).strip()
    else:
        return "IncorrectQZYMP"

    key_structure = base64.b64decode(key_structure)

    n = int.from_bytes(key_structure[1:129], byteorder='big')
    e = int.from_bytes(key_structure[129:257], byteorder='big')
    d = int.from_bytes(key_structure[257:], byteorder='big')

    message_encoded = [ord(ch) for ch in message]
    cipher = [pow(ch, d, n) for ch in message_encoded]
    ciphertext = "\t".join(str(ch) for ch in cipher)
    return ciphertext


def decode(public_key_pem, ciphertext):

    match = re.search(
        r'-----BEGIN PUBLIC KEY-----(.*?)-----END PUBLIC KEY-----', public_key_pem, re.DOTALL)
    if match:
        key_structure = match.group(1).strip()
    else:
        return "IncorrectQZYMP"


    key_structure = base64.b64decode(key_structure)

    n = int.from_bytes(key_structure[1:129], byteorder='big')
    e = int.from_bytes(key_structure[129:257], byteorder='big')

    ciphertext = ciphertext.split("\t")
    message_decoded = [pow(int(ch), e, n) for ch in ciphertext]
    message_new = "".join(chr(ch) for ch in message_decoded)
    return message_new