#!/usr/bin/env python3
"""
Reader API Speed Test Script

This script performs performance testing on the Reader API to measure
response times and throughput for various content types.

Requirements:
    uv pip install requests

Usage:
    uv run speedtest.py
"""

import requests
import time
import statistics
import sys
from typing import List, Dict, Any
from urllib.parse import quote


class SpeedTester:
    """Performance testing for Reader API"""

    def __init__(self, base_url: str = "http://127.0.0.1:3000"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()

    def test_url(self, url: str, format_type: str = "json") -> Dict[str, Any]:
        """Test a single URL and return timing data"""
        start_time = time.time()

        try:
            if format_type == "json":
                headers = {'Accept': 'application/json'}
            elif format_type == "markdown":
                headers = {'Accept': 'text/plain'}
            elif format_type == "html":
                headers = {'X-Respond-With': 'html'}
            else:
                headers = {}

            encoded_url = quote(url, safe='')
            response = self.session.get(
                f"{self.base_url}/{encoded_url}",
                headers=headers,
                timeout=30
            )
            response.raise_for_status()

            end_time = time.time()
            response_time = end_time - start_time

            return {
                'success': True,
                'response_time': response_time,
                'status_code': response.status_code,
                'content_length': len(response.text),
                'url': url,
                'format': format_type
            }

        except Exception as e:
            end_time = time.time()
            response_time = end_time - start_time

            return {
                'success': False,
                'response_time': response_time,
                'error': str(e),
                'url': url,
                'format': format_type
            }

    def run_speed_test(self, urls: List[str], iterations: int = 3) -> Dict[str, Any]:
        """Run comprehensive speed test"""
        results = []

        print(f"🚀 Starting speed test with {len(urls)} URLs, {iterations} iterations each")
        print("=" * 60)

        for i, url in enumerate(urls, 1):
            print(f"\n📊 Testing URL {i}/{len(urls)}: {url}")

            url_results = []

            # Test each format
            for format_type in ['json', 'markdown', 'html']:
                format_results = []

                for iteration in range(iterations):
                    print(f"  🔄 {format_type.upper()} iteration {iteration + 1}/{iterations}...", end='', flush=True)
                    result = self.test_url(url, format_type)
                    format_results.append(result)

                    if result['success']:
                        print(f" ✅ ({result['response_time']:.2f}s)")
                    else:
                        print(f" ❌ ({result.get('error', 'Unknown error')[:50]})")

                # Calculate statistics for this format
                successful_results = [r for r in format_results if r['success']]
                if successful_results:
                    response_times = [r['response_time'] for r in successful_results]
                    avg_time = statistics.mean(response_times)
                    min_time = min(response_times)
                    max_time = max(response_times)

                    print(f"  ✅ {format_type.upper()}: {len(successful_results)}/{iterations} successful (avg: {avg_time:.2f}s, min: {min_time:.2f}s, max: {max_time:.2f}s)")
                    url_results.append({
                        'format': format_type,
                        'success_count': len(successful_results),
                        'total_count': iterations,
                        'avg_time': avg_time,
                        'min_time': min_time,
                        'max_time': max_time,
                        'success_rate': len(successful_results) / iterations * 100
                    })
                else:
                    print(f"  ❌ {format_type.upper()}: All {iterations} requests failed")
                    url_results.append({
                        'format': format_type,
                        'success_count': 0,
                        'total_count': iterations,
                        'success_rate': 0
                    })

            results.append({
                'url': url,
                'formats': url_results
            })

        return self._generate_report(results)

    def _generate_report(self, results: List[Dict]) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        total_requests = 0
        successful_requests = 0
        all_response_times = []

        format_stats = {
            'json': {'times': [], 'successes': 0, 'total': 0},
            'markdown': {'times': [], 'successes': 0, 'total': 0},
            'html': {'times': [], 'successes': 0, 'total': 0}
        }

        for url_result in results:
            for format_result in url_result['formats']:
                format_type = format_result['format']
                format_stats[format_type]['total'] += format_result['total_count']
                format_stats[format_type]['successes'] += format_result['success_count']

                if 'avg_time' in format_result:
                    # Add average time for each successful iteration
                    format_stats[format_type]['times'].extend([format_result['avg_time']] * format_result['success_count'])
                    all_response_times.extend([format_result['avg_time']] * format_result['success_count'])

                total_requests += format_result['total_count']
                successful_requests += format_result['success_count']

        # Calculate overall statistics
        overall_success_rate = successful_requests / total_requests * 100 if total_requests > 0 else 0

        report = {
            'summary': {
                'total_requests': total_requests,
                'successful_requests': successful_requests,
                'overall_success_rate': overall_success_rate,
                'average_response_time': statistics.mean(all_response_times) if all_response_times else 0,
                'median_response_time': statistics.median(all_response_times) if all_response_times else 0,
                'min_response_time': min(all_response_times) if all_response_times else 0,
                'max_response_time': max(all_response_times) if all_response_times else 0
            },
            'format_breakdown': {},
            'url_results': results
        }

        # Format-specific statistics
        for format_type, stats in format_stats.items():
            if stats['times']:
                report['format_breakdown'][format_type] = {
                    'success_rate': stats['successes'] / stats['total'] * 100,
                    'average_time': statistics.mean(stats['times']),
                    'median_time': statistics.median(stats['times']),
                    'min_time': min(stats['times']),
                    'max_time': max(stats['times']),
                    'total_requests': stats['total'],
                    'successful_requests': stats['successes']
                }
            else:
                report['format_breakdown'][format_type] = {
                    'success_rate': 0,
                    'total_requests': stats['total'],
                    'successful_requests': stats['successes']
                }

        return report


def print_report(report: Dict[str, Any]):
    """Print formatted performance report"""
    print("\n" + "="*80)
    print("📊 PERFORMANCE TEST RESULTS")
    print("="*80)

    summary = report['summary']
    print("\n🎯 OVERALL SUMMARY:")
    print(f"   Total Requests: {summary['total_requests']}")
    print(f"   Successful Requests: {summary['successful_requests']}")
    print(f"   Overall Success Rate: {summary['overall_success_rate']:.1f}%")
    print(f"   Average Response Time: {summary['average_response_time']:.2f}s")
    print(f"   Median Response Time: {summary['median_response_time']:.2f}s")
    print(f"   Min Response Time: {summary['min_response_time']:.2f}s")
    print(f"   Max Response Time: {summary['max_response_time']:.2f}s")

    print("\n📋 FORMAT BREAKDOWN:")
    for format_type, stats in report['format_breakdown'].items():
        print(f"\n🔸 {format_type.upper()}:")
        print(f"   Success Rate: {stats['success_rate']:.1f}%")
        if 'average_time' in stats:
            print(f"   Average Time: {stats['average_time']:.2f}s")
            print(f"   Median Time: {stats['median_time']:.2f}s")
            print(f"   Min Time: {stats['min_time']:.2f}s")
            print(f"   Max Time: {stats['max_time']:.2f}s")

    print("\n📈 INDIVIDUAL URL RESULTS:")
    for url_result in report['url_results']:
        print(f"\n🌐 {url_result['url']}:")
        for format_result in url_result['formats']:
            success_rate = format_result['success_rate']
            status = "✅" if success_rate == 100 else "⚠️" if success_rate > 0 else "❌"
            print(f"   {status} {format_result['format'].upper()}: {format_result['success_rate']:.1f}% success")
            if 'avg_time' in format_result:
                print(f"      Average: {format_result['avg_time']:.2f}s")

    print("\n" + "="*80)


def check_server_status(base_url: str) -> bool:
    """Check if the Reader server is running"""
    try:
        print("🔍 Checking server status...")
        response = requests.get(f"{base_url}/", timeout=10)

        if response.status_code == 200 and ("dearreader" in response.text.lower() or "local web content" in response.text.lower()):
            print("✅ Reader server is running!")
            return True
        else:
            print(f"⚠️ Server responded but unexpected content (status: {response.status_code})")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Reader server")
        print("\n🐳 To start the server:")
        print("   docker run -p 3000:3000 -v ./storage:/app/local-storage reader-app")
        return False
    except Exception as e:
        print(f"❌ Server check error: {e}")
        return False


def main():
    """Main speed test function"""
    print("🚀 DearReader API Speed Test")
    print("="*50)

    # Initialize speed tester
    tester = SpeedTester()

    # Check server status
    if not check_server_status(tester.base_url):
        sys.exit(1)

    # Test URLs focused on reading and education
    test_urls = [
        "https://www.ala.org",  # American Library Association
        "https://www.readingpartners.org",  # Reading Partners
        "https://literacy.org",  # ProLiteracy
        "https://en.wikipedia.org/wiki/Reading"  # Reading on Wikipedia
    ]

    # Run speed test
    print("\n🏃 Running comprehensive speed test...")
    report = tester.run_speed_test(test_urls, iterations=3)

    # Print results
    print_report(report)

    print("\n🎉 Speed test complete!")
    print("💡 Tips for better performance:")
    print("   • Use caching for repeated requests")
    print("   • Consider rate limiting for production use")
    print("   • Monitor server resources during high load")


if __name__ == "__main__":
    main()
