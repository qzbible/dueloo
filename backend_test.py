#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import os

class BibleQuestAPITester:
    def __init__(self, base_url="https://biblequest-preview-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {status}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response: {response.text[:200]}", "ERROR")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}", "FAIL")
            return False, {}

    def create_test_user(self):
        """Create test user and session using MongoDB directly"""
        self.log("Creating test user and session...")
        
        # Generate test data
        timestamp = int(datetime.now().timestamp())
        self.user_id = f"test-user-{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        
        # MongoDB commands to create test user and session
        mongo_commands = f"""
mongosh --eval "
use('test_database');
db.users.insertOne({{
  user_id: '{self.user_id}',
  email: 'test.user.{timestamp}@example.com',
  name: 'Test User {timestamp}',
  picture: 'https://via.placeholder.com/150',
  level: 1,
  xp: 0,
  lives: 5,
  coins: 0,
  is_premium: false,
  premium_expires_at: null,
  created_at: new Date()
}});
db.user_sessions.insertOne({{
  user_id: '{self.user_id}',
  session_token: '{self.session_token}',
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
}});
print('Test user created successfully');
"
        """
        
        try:
            os.system(mongo_commands)
            self.log(f"✅ Test user created - ID: {self.user_id}")
            self.log(f"✅ Session token: {self.session_token}")
            return True
        except Exception as e:
            self.log(f"❌ Failed to create test user: {e}", "ERROR")
            return False

    def cleanup_test_data(self):
        """Clean up test data"""
        self.log("Cleaning up test data...")
        cleanup_commands = f"""
mongosh --eval "
use('test_database');
db.users.deleteMany({{email: /test\\.user\\./}});
db.user_sessions.deleteMany({{session_token: /test_session/}});
db.user_progress.deleteMany({{user_id: /test-user-/}});
db.daily_manna.deleteMany({{user_id: /test-user-/}});
print('Test data cleaned up');
"
        """
        try:
            os.system(cleanup_commands)
            self.log("✅ Test data cleaned up")
        except Exception as e:
            self.log(f"❌ Cleanup failed: {e}", "ERROR")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        self.log("=== Testing Authentication Endpoints ===")
        
        # Test /auth/me
        success, user_data = self.run_test(
            "Get current user",
            "GET",
            "auth/me",
            200
        )
        
        if success and user_data:
            self.log(f"   User: {user_data.get('name', 'Unknown')}")
            self.log(f"   Level: {user_data.get('level', 0)}")
            self.log(f"   XP: {user_data.get('xp', 0)}")
            self.log(f"   Lives: {user_data.get('lives', 0)}")
            self.log(f"   Coins: {user_data.get('coins', 0)}")
        
        return success

    def test_questions_endpoint(self):
        """Test questions endpoint"""
        self.log("=== Testing Questions Endpoint ===")
        
        # Test random questions
        success, questions = self.run_test(
            "Get random questions",
            "GET",
            "questions/random?limit=5",
            200
        )
        
        if success and questions:
            self.log(f"   Retrieved {len(questions)} questions")
            if questions:
                sample_q = questions[0]
                self.log(f"   Sample question: {sample_q.get('text', 'N/A')[:50]}...")
                self.log(f"   Book: {sample_q.get('book', 'N/A')}")
                self.log(f"   Options count: {len(sample_q.get('options', []))}")
        
        # Test questions by book
        success2, book_questions = self.run_test(
            "Get questions by book",
            "GET",
            "questions/random?book=Genèse&limit=3",
            200
        )
        
        return success and success2

    def test_progress_endpoints(self):
        """Test progress endpoints"""
        self.log("=== Testing Progress Endpoints ===")
        
        # Test get progress
        success1, progress = self.run_test(
            "Get user progress",
            "GET",
            "progress",
            200
        )
        
        # Test update progress
        success2, update_result = self.run_test(
            "Update progress",
            "POST",
            "progress/update?book=Genèse&score=4&completed=true",
            200
        )
        
        if success2 and update_result:
            self.log(f"   XP gained: {update_result.get('xp_gained', 0)}")
            self.log(f"   New level: {update_result.get('new_level', 0)}")
        
        return success1 and success2

    def test_badges_endpoint(self):
        """Test badges endpoint"""
        self.log("=== Testing Badges Endpoint ===")
        
        success, badges = self.run_test(
            "Get user badges",
            "GET",
            "badges",
            200
        )
        
        if success:
            self.log(f"   User has {len(badges)} badges")
            for badge in badges:
                self.log(f"   Badge: {badge.get('name', 'Unknown')} {badge.get('icon', '')}")
        
        return success

    def test_daily_manna_endpoints(self):
        """Test daily manna endpoints"""
        self.log("=== Testing Daily Manna Endpoints ===")
        
        # Test get status
        success1, status = self.run_test(
            "Get daily manna status",
            "GET",
            "daily-manna/status",
            200
        )
        
        if success1 and status:
            self.log(f"   Can play: {status.get('can_play', False)}")
            self.log(f"   Streak: {status.get('streak', 0)}")
        
        # Test complete daily manna (if can play)
        if success1 and status.get('can_play', False):
            success2, result = self.run_test(
                "Complete daily manna",
                "POST",
                "daily-manna?coins=10",
                200
            )
            
            if success2 and result:
                self.log(f"   Coins earned: {result.get('coins_earned', 0)}")
                self.log(f"   New streak: {result.get('streak', 0)}")
            
            return success1 and success2
        else:
            self.log("   Skipping daily manna completion (already played today)")
            return success1

    def test_premium_endpoints(self):
        """Test premium endpoints"""
        self.log("=== Testing Premium Endpoints ===")
        
        # Test checkout creation
        success, checkout_data = self.run_test(
            "Create premium checkout",
            "POST",
            "premium/checkout",
            200,
            data={
                "package_id": "1h",
                "origin_url": "https://biblequest-preview-1.preview.emergentagent.com"
            }
        )
        
        if success and checkout_data:
            self.log(f"   Checkout URL created: {checkout_data.get('url', 'N/A')[:50]}...")
            session_id = checkout_data.get('session_id')
            
            if session_id:
                # Test payment status check
                success2, status = self.run_test(
                    "Check payment status",
                    "GET",
                    f"premium/status/{session_id}",
                    200
                )
                
                if success2 and status:
                    self.log(f"   Payment status: {status.get('status', 'unknown')}")
                
                return success and success2
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting BibleQuest API Testing")
        self.log(f"Backend URL: {self.base_url}")
        
        # Create test user
        if not self.create_test_user():
            self.log("❌ Failed to create test user, aborting tests", "ERROR")
            return False
        
        try:
            # Run all test suites
            auth_ok = self.test_auth_endpoints()
            questions_ok = self.test_questions_endpoint()
            progress_ok = self.test_progress_endpoints()
            badges_ok = self.test_badges_endpoint()
            daily_ok = self.test_daily_manna_endpoints()
            premium_ok = self.test_premium_endpoints()
            
            # Print summary
            self.log("=" * 50)
            self.log(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
            self.log(f"✅ Auth endpoints: {'PASS' if auth_ok else 'FAIL'}")
            self.log(f"✅ Questions endpoint: {'PASS' if questions_ok else 'FAIL'}")
            self.log(f"✅ Progress endpoints: {'PASS' if progress_ok else 'FAIL'}")
            self.log(f"✅ Badges endpoint: {'PASS' if badges_ok else 'FAIL'}")
            self.log(f"✅ Daily Manna endpoints: {'PASS' if daily_ok else 'FAIL'}")
            self.log(f"✅ Premium endpoints: {'PASS' if premium_ok else 'FAIL'}")
            
            success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
            self.log(f"📈 Success rate: {success_rate:.1f}%")
            
            return success_rate >= 80
            
        finally:
            # Always cleanup
            self.cleanup_test_data()

def main():
    tester = BibleQuestAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())